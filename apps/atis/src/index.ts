/**
 * atis: a weather map for code changes.
 *
 * `0.0.0` holds the name on npm. The command prints its version and exits; the
 * map arrives with the phases in `SPEC.md` at the repository root.
 */

export const NAME = 'atis';
export const VERSION = '0.0.0';

export const USAGE = `${NAME} ${VERSION}: a weather map for code changes.

  atis --version   print the version
  atis --help      print this text

Nothing renders yet: this release holds the name. Follow the build at
https://github.com/robmclarty/atis
`;

/** What the command prints and how it exits: 0 when it did its job, 2 on misuse. */
export type Outcome = { exitCode: 0 | 2; stdout: string; stderr: string };

/** Interpret the arguments after the script name. */
export function run(argv: readonly string[]): Outcome {
  const [flag] = argv;
  if (argv.length === 1 && (flag === '--version' || flag === '-V')) {
    return { exitCode: 0, stdout: `${VERSION}\n`, stderr: '' };
  }
  if (argv.length === 1 && (flag === '--help' || flag === '-h')) {
    return { exitCode: 0, stdout: USAGE, stderr: '' };
  }
  return { exitCode: 2, stdout: '', stderr: USAGE };
}
