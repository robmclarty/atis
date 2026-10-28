import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { assertMap, buildMap } from 'core';
import type { MapJson } from 'core';
import { afterAll, expect, test } from 'vitest';

import { run } from '../run.js';
import { PRODUCERS, diffTerraform, readTerraformDependencies, readTree, terraformBlocks, terraformScan } from '../sources/index.js';
import type { Scan, TerraformSource } from '../sources/index.js';

/**
 * The Terraform producer (D116): an HCL parser atis carries reads every `.tf`
 * and `.tftest.hcl` file, with no `terraform` and no `terraform init`. Each
 * tree is written from these strings into a `mkdtemp` directory (D42).
 */

const MINUTE = 60_000;

/** A root module calling a local module and a registry one, pinning a provider; the called module with a test beside it; and tflint's config. */
const INFRA: Readonly<Record<string, string>> = {
  'infra/live/main.tf': `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

module "network" {
  source = "../modules/network"
  cidr   = var.cidr
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"
}

resource "aws_instance" "web" {
  subnet_id = module.network.subnet_id
  tags      = local.tags
}
`,
  'infra/live/variables.tf': `variable "cidr" {
  type    = string
  default = "10.0.0.0/16"
}

locals {
  tags = { team = "web" }
}
`,
  'infra/live/outputs.tf': `output "web_id" {
  value = aws_instance.web.id
}
`,
  'infra/modules/network/main.tf': `variable "cidr" {
  type = string
}

resource "aws_subnet" "this" {
  cidr_block = var.cidr
}
`,
  'infra/modules/network/outputs.tf': `output "subnet_id" {
  value     = aws_subnet.this.id
  sensitive = true
}
`,
  'infra/modules/network/tests/network.tftest.hcl': `run "plan" {
  command = plan

  variables {
    cidr = "10.0.0.0/24"
  }
}
`,
  'infra/.tflint.hcl': `plugin "aws" {\n  enabled = true\n}\n`,
};

const scratch: string[] = [];

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function writeTree(tree: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'atis-terraform-'));
  scratch.push(root);
  for (const [path, content] of Object.entries(tree)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function sources(tree: Readonly<Record<string, string>>): readonly TerraformSource[] {
  return Object.entries(tree)
    .filter(([path]) => path.endsWith('.tf') || path.endsWith('.tftest.hcl'))
    .map(([path, text]) => ({ path, text }));
}

/** A tree's map as a change of nothing, so its terrain and its instruments are what the scan alone made. */
function mapOf(scan: Scan): MapJson {
  const map = buildMap({
    meta: { repo: 'infra', base: 'main', head: 'h'.repeat(40), merge_base: 'b'.repeat(40), generated_at: '' },
    base: scan,
    head: scan,
    diff: [],
    deps_added: [],
    commits: [],
    head_time: 0,
    check: { mode: 'git-only', reason: '.check/ is absent' },
  });
  assertMap(map);
  return map;
}

test('Terraform is the fourth producer, claiming .tf and .tftest.hcl files, and it can always run (D114, D116)', () => {
  const terraform = PRODUCERS.find((producer) => producer.id === 'terraform');
  expect(PRODUCERS.map((producer) => producer.id).slice(0, 4)).toEqual(['typescript', 'go', 'python', 'terraform']);
  expect(terraform?.extensions).toEqual(['.tf', '.tftest.hcl']);
  expect(terraform?.unavailable()).toBeUndefined();
});

test('terraformBlocks finds each top-level block by its lines, past braces in strings, interpolations, heredocs and comments (D30)', () => {
  const source = `# a comment { with a brace
variable "a" {}

locals {
  greeting = "}\${lookup(var.m, "k", "{")}"
  policy   = <<-EOT
    { "Version": "2012-10-17" }
  EOT
  /* a } block comment */
}

resource "aws_s3_bucket" "b" {
  tags = { name = "b" } // and a } line comment
}
`;
  expect(terraformBlocks(source)).toEqual([
    { kind: 'variable', labels: ['a'], start: 2, end: 2 },
    { kind: 'locals', labels: [], start: 4, end: 10 },
    { kind: 'resource', labels: ['aws_s3_bucket', 'b'], start: 12, end: 14 },
  ]);
});

test("a module's variables and outputs are its interface, each shaped by its type and default, and a test exports nothing (D76, D116)", () => {
  const { files } = terraformScan(sources(INFRA));
  expect(files.map((file) => [file.path, file.kind, file.exports])).toEqual([
    ['infra/live/main.tf', 'source', []],
    ['infra/live/outputs.tf', 'source', ['output.web_id']],
    ['infra/live/variables.tf', 'source', ['var.cidr']],
    ['infra/modules/network/main.tf', 'source', ['var.cidr']],
    ['infra/modules/network/outputs.tf', 'source', ['output.subnet_id']],
    ['infra/modules/network/tests/network.tftest.hcl', 'test', []],
  ]);
  const shapes = Object.fromEntries(files.map((file) => [file.path, file.shapes]));
  expect(shapes['infra/live/variables.tf']).toEqual({ 'var.cidr': 'variable "cidr" { type = string, default = "10.0.0.0/16" }' });
  expect(shapes['infra/modules/network/main.tf']).toEqual({ 'var.cidr': 'variable "cidr" { type = string }' });
  expect(shapes['infra/modules/network/outputs.tf']).toEqual({ 'output.subnet_id': 'output "subnet_id" { sensitive = true }' });

  // Retyping a variable moves its shape; a description does not.
  const retyped = terraformScan(sources({ ...INFRA, 'infra/modules/network/main.tf': (INFRA['infra/modules/network/main.tf'] ?? '').replace('type = string', 'type = list(string)\n  description = "Where."') }));
  expect(retyped.files.find((file) => file.path === 'infra/modules/network/main.tf')?.shapes).toEqual({ 'var.cidr': 'variable "cidr" { type = list(string) }' });
});

test('a module call reaches every file of the module it calls, and a file reaches what its own module declares for each name it reads (D116)', () => {
  const { edges, files } = terraformScan(sources(INFRA));
  expect(edges.map((edge) => [edge.from, edge.to, edge.names, edge.line])).toEqual([
    ['infra/live/main.tf', 'infra/modules/network/main.tf', ['*'], 10],
    ['infra/live/main.tf', 'infra/modules/network/outputs.tf', ['*'], 10],
    ['infra/live/main.tf', 'infra/live/variables.tf', ['local.tags', 'var.cidr'], 12],
    ['infra/live/outputs.tf', 'infra/live/main.tf', ['aws_instance.web'], 2],
    ['infra/modules/network/outputs.tf', 'infra/modules/network/main.tf', ['aws_subnet.this'], 2],
    // A test reaches the module it sits beside, from its first run.
    ['infra/modules/network/tests/network.tftest.hcl', 'infra/modules/network/main.tf', ['*'], 1],
    ['infra/modules/network/tests/network.tftest.hcl', 'infra/modules/network/outputs.tf', ['*'], 1],
  ]);
  // Registry modules and providers are outside packages; a local module is none (D170).
  expect(files.find((file) => file.path === 'infra/live/main.tf')).toMatchObject({
    packages: ['hashicorp/aws', 'terraform-aws-modules/vpc/aws'],
    code: [
      { start: 1, end: 8 },
      { start: 10, end: 13 },
      { start: 15, end: 18 },
      { start: 20, end: 23 },
    ],
    functions: [],
  });
});

test('a module no other module calls is a root module, its files the entry points; modules are directory cells (D116)', () => {
  const scan = readTree(writeTree(INFRA)).scan;
  expect(scan.members).toEqual([
    { name: '.', dir: '.', entry: ['infra/live/main.tf', 'infra/live/outputs.tf', 'infra/live/variables.tf'], published: false, surface: [] },
  ]);
  expect(scan.entry_points).toEqual({ source: 'manifests', reason: 'the root modules, which no module calls, are the entry points' });
  const { terrain } = mapOf(scan);
  expect(terrain.cells.filter((cell) => cell.kind === 'directory').map((cell) => cell.path)).toEqual(['infra/live', 'infra/modules/network']);
  expect(terrain.groups.find((group) => group.id === 'config')?.files).toEqual(['infra/.tflint.hcl']);
  // The root module stands above the module it calls, depth falling along the longest path (D26).
  const band = (path: string): number => terrain.organelles.find((organelle) => organelle.path === path)?.band ?? -1;
  expect(band('infra/live/outputs.tf')).toBe(0);
  expect(band('infra/modules/network/main.tf')).toBeGreaterThan(band('infra/live/main.tf'));
});

test('a file the parser cannot read keeps the blocks its walk found, their shapes uncompared (C2)', () => {
  const { files } = terraformScan([{ path: 'broken/main.tf', text: 'variable "a" {\n  type = \n}\n\noutput "b" {\n  value = 1\n}\n' }]);
  expect(files[0]).toMatchObject({ exports: ['output.b', 'var.a'], shapes: { 'output.b': null, 'var.a': null }, packages: [] });
});

test('diffTerraform names the modules and providers a change added and the versions it moved (D47, D83)', () => {
  const before = INFRA['infra/live/main.tf'] ?? '';
  const after = `${before.replace('~> 5.0', '~> 5.1').replace('5.1.0', '5.2.0')}
module "dns" {
  source = "git::https://example.com/dns.git//modules/zone?ref=v1.2.0"
}

terraform {
  required_providers {
    random = "~> 3.0"
  }
}
`;
  expect(diffTerraform('infra/live/main.tf', before, after)).toEqual({
    deps_added: [
      { manifest: 'infra/live/main.tf', name: 'hashicorp/random', range: '~> 3.0', dev: false },
      { manifest: 'infra/live/main.tf', name: 'https://example.com/dns.git//modules/zone', range: 'v1.2.0', dev: false },
    ],
    deps_moved: [
      { manifest: 'infra/live/main.tf', name: 'hashicorp/aws', range: '~> 5.1', from: '~> 5.0', dev: false },
      { manifest: 'infra/live/main.tf', name: 'terraform-aws-modules/vpc/aws', range: '5.2.0', from: '5.1.0', dev: false },
    ],
  });
  // A file born brings every dependency it declares; a local module is none.
  expect(diffTerraform('infra/modules/network/main.tf', undefined, INFRA['infra/modules/network/main.tf'])).toEqual({ deps_added: [], deps_moved: [] });
});

test('a run maps the modules and providers a change added and moved into the weather, read from git at both ends (D47, D116)', { timeout: MINUTE }, () => {
  const repo = writeTree(INFRA);
  const git = (...args: readonly string[]): string =>
    execFileSync('git', ['-c', 'user.name=atis', '-c', 'user.email=atis@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, encoding: 'utf8' }).trim();
  git('init', '--quiet');
  git('add', '.');
  git('commit', '--quiet', '-m', 'feat: a network');
  const main = join(repo, 'infra', 'live', 'main.tf');
  writeFileSync(main, `${readFileSync(main, 'utf8').replace('~> 5.0', '~> 5.1')}\nmodule "dns" {\n  source  = "terraform-aws-modules/route53/aws"\n  version = "4.0.0"\n}\n`);
  git('commit', '--quiet', '-am', 'feat: a zone');

  expect(readTerraformDependencies(repo, 'HEAD~1', ['infra/live/main.tf', 'README.md'], 'HEAD').deps_added.map((dep) => dep.name)).toEqual(['terraform-aws-modules/route53/aws']);
  const out = join(writeTree({}), 'map.json');
  const outcome = run({ repo, base: 'HEAD~1', out, cache: false, verbose: false });
  expect(outcome.exitCode, outcome.stderr).toBe(0);
  const map = JSON.parse(readFileSync(out, 'utf8')) as MapJson;
  expect(map.weather.dependencies?.filter((dependency) => dependency.change !== undefined).map((dependency) => [dependency.name, dependency.change])).toEqual([
    ['hashicorp/aws', 'moved'],
    ['terraform-aws-modules/route53/aws', 'added'],
  ]);
});
