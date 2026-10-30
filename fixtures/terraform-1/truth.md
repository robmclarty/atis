# Ground truth · terraform fixture 1

**Verdict: hold**, per D59, from the human review below. No recollection, no
`needs Rob` lines.

## The review

`CHANGES_REQUESTED` by `erikdw` (CONTRIBUTOR), 2026-10-08,
[review 5464069897](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#pullrequestreview-5464069897),
submitted against `a6518ac715fd592ca61af65796a11dfffcf29028`, the fixture commit.

The review has no body. Three inline comments go with it, all on the PR's own Terraform. The
first two are the ones that qualify it. On `modules/loop-runtime-sandbox-aws-microvm/main.tf`,
line 197, `availability_zone = element(local.egress_gateway_nlb_azs, count.index)`
([discussion r4225177316](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#discussion_r4225177316)):

> This replaces existing sandbox subnets on upgrade, which **_prevents the apply from
> succeeding_**.
>
> `availability_zone` is ForceNew, and these CIDRs stay `10.255.1.0/24` through `.3`, so
> Terraform deletes the old subnet before it can create the new one. From v6.8.1 the
> restricted-egress connector still has network interfaces in those subnets. AWS will not delete
> them, and the connector cannot take the new subnet IDs until those subnets exist.
>
> v6.8.1 placed these subnets in the region's first three zones. This expression uses the main
> VPC private subnet zones instead. Default stacks whose private subnets are already those first
> three zones, in that order, do not move. `create_vpc = false` and custom `private_subnet_*_az`
> can. The tests start from empty state, so they never exercise this upgrade.
>
> Restore the `data.aws_availability_zones.available` data source (this PR removes it; v6.8.1
> declared it with `count`) and leave this resource on
> `data.aws_availability_zones.available[0].names[count.index]` and the existing CIDRs. Add a
> separate subnet resource in this VPC, `10.255.4.0/24` through `10.255.6.0/24`, in the NLB
> zones, and associate the existing route table. A fresh install then has six subnets: the
> original three, plus these three for the endpoint. Put only the new interface endpoint in
> those subnets. Leave the connector `SubnetIds` on the original three so CloudFormation does
> not update it.
>
> A supplied sandbox VPC is already covered. The README requires one supplied subnet in a
> main-VPC zone, and the precondition fails the plan otherwise.

On `modules/loop-runtime-ecs/main.tf`, line 604, the new second `load_balancer` block of
`aws_ecs_service.loop_runtime`
([discussion r4225177321](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#discussion_r4225177321)):

> ECS replaces a task that fails any attached target group's health check. This group checks TCP
> 4002, the grace period is 60 seconds, and `wait_for_steady_state` is true. If the image does
> not listen on 4002, tasks cycle and the apply hangs.
>
> `v2.15.0` does not listen. The sandbox proxy (`LOOP_RUNTIME_SANDBOX_FORWARD_PROXY_LISTEN`)
> landed after that tag, and this module sets it to `0.0.0.0:4002`. Stacks that pin
> `loop_runtime_version_override = "v2.15.0"` will stall. The default moving tag `latest-2.x` is
> fine only while that tag includes the proxy. Please name that minimum image in the PR body and
> the release notes.

The third is smaller, a doubt and a request for a comment, and is not counted. On
`modules/loop-runtime-sandbox-aws-microvm/main.tf`, line 667, the first of the two DNS
resolver egress rules
([discussion r4225177325](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#discussion_r4225177325)):

> On ordinary EC2, security groups do not filter traffic to the Amazon DNS resolver
> (`169.254.169.253` and the VPC network address + 2), so these rules may do nothing. If MicroVM
> network connectors are different and the rules are required, a short comment saying that would
> help.
>
> If they do take effect, a supplied sandbox VPC with no DNS firewall can now send DNS queries
> it could not send before. The README already says the caller controls DNS there. One sentence
> that these rules allow port 53 to the resolver addresses would make that explicit.

The same reviewer then submitted a second review of the same commit as `COMMENTED`, at
2026-10-09T00:07:21Z
([review 5464300588](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#pullrequestreview-5464300588)),
whose body is not a request of its own but restates the hold:

> Holding for the sandbox subnet upgrade in the comment on `aws_subnet.restricted_egress`. Once
> those existing subnets stay in place, this can be a minor release.
>
> Downgrade keeps the connector, its security group, and the operator role, because Terraform
> maps those addresses back to count index 0. It deletes the new load balancer, endpoint
> service, and interface endpoint, and the Loop service drops the port 4002 target group. The
> description already says that. Please also name the minimum Loop runtime image that listens on
> 4002 in the release notes.
>
> Nit: `loop_runtime_alb_deregistration_delay` is now also the egress gateway deregistration
> delay, but its description still says the Loop runtime ALB target group. The submodule
> validates 0–3600 and the root input does not, so a bad value fails inside the submodule.

## Why it qualifies

The reviewer is a human and the review is a `CHANGES_REQUESTED` on exactly the fixture commit.
He names two problems in the PR's own Terraform, both about what the change does to a stack that
already exists, and notes that the PR's plan tests start from empty state, so they never
exercise it.

The first is a bug that stops an upgrade. At the merge base `aws_subnet.restricted_egress` put
its three subnets in the region's first three zones,
`data.aws_availability_zones.available[0].names[count.index]`. At the fixture commit it takes
`element(local.egress_gateway_nlb_azs, count.index)`, the zones of the egress load balancer's
subnets, and the `data.aws_availability_zones.available` source is gone from the module. The
reviewer's reading is that `availability_zone` forces a new subnet and the CIDRs stay
`10.255.1.0/24` to `.3`, so on a stack whose zones differ Terraform deletes the old subnets
before it can create the new ones, while the already released restricted-egress connector still
has network interfaces in them: in his words this "prevents the apply from succeeding".

The second is a behaviour risk in the same change. The PR attaches a second target group, a TCP
health check on port 4002, to the Loop runtime ECS service, which waits for a steady state. The
reviewer's reading is that an image that does not listen on 4002 has its tasks replaced in a
loop and the apply hangs, and that `loop_runtime_version_override` still lets a stack pin such an
image (`v2.15.0`).

The third comment, on whether security group rules can filter traffic to the VPC resolver at all,
leans toward documentation and is left out of the case. None of the three is naming, style, docs
or changelog.

## The flagged thing

At the fixture commit:

- `modules/loop-runtime-sandbox-aws-microvm/main.tf`: `resource "aws_subnet" "restricted_egress"`,
  lines 194 to 205, with the flagged `availability_zone` at line 197; `local.egress_gateway_nlb_azs`
  at line 34, built from `data "aws_subnet" "egress_gateway_nlb"` at lines 509 to 513. At the
  merge base the same resource read `data.aws_availability_zones.available[0].names[count.index]`.
- `modules/loop-runtime-ecs/main.tf`: the second `load_balancer` block of
  `aws_ecs_service.loop_runtime`, lines 604 to 608, inside the service at lines 574 to 619, whose
  `health_check_grace_period_seconds = 60` and `wait_for_steady_state = true` are at lines 581 and
  582; `egress_gateway_port = 4002` at line 8. The target group it attaches is
  `aws_lb_target_group.egress_gateway` in `modules/loop-runtime-sandbox-aws-microvm/main.tf`,
  lines 597 to 612, with its TCP `health_check` at lines 605 to 607.
- `variables.tf`: `loop_runtime_version_override`, lines 743 to 747, whose description names no
  minimum image.
- `modules/loop-runtime-sandbox-aws-microvm/main.tf`: the two DNS resolver rules,
  `sandbox_to_dns_link_local` at lines 667 to 677 and `sandbox_to_dns_vpc` at lines 679 to 689.

## What followed

The author, `alexr17`, answered the three threads the same night. On the version pin
([discussion r4225244029](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#discussion_r4225244029)), at 2026-10-08T23:42:49Z:

> i don't want to support `loop_runtime_version_override`which is why i tried to remove it
> already. can i just reject the terraform if this value is set to something?

On the subnets
([discussion r4225245411](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#discussion_r4225245411)), at 2026-10-08T23:43:04Z:

> yeah i see okay i will fi

On the DNS rules
([discussion r4225256559](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#discussion_r4225256559)), at 2026-10-08T23:45:04Z:

> yeah sg

On 2026-10-09 `erikdw` added to the version-pin thread that dropping an input people may have
set belongs in a major release, and that losing the way to patch the Loop image without a module
release feels regressive. The author's last word there
([discussion r4235505475](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#discussion_r4235505475)):

> i think we just need to document, this stuff won't work till 2.16.0

The author pushed [`e4b26ed`](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405/commits/e4b26ed5315fe7ae7fd19cbce95ab8bded81f527)
("Address Loop sandbox networking review feedback", 2026-10-09), which returned `aws_subnet.restricted_egress`
to the first three zones and the `10.255.1.0/24` to `.3` CIDRs, added a separate
`aws_subnet.egress_gateway` at `10.255.4.0/24` to `.6` in the load balancer's zones (the
reviewer's design), put the 2.16.0 requirement in the `loop_runtime_version_override`
description, and commented the DNS rules ("Ordinary VPC security groups cannot filter
AmazonProvidedDNS traffic."). Four more commits followed (two merges of `main`, `a0aefff` "Fix
Loop Runtime ulimit test target group fixture" and `666b31a` "Simplify restricted sandbox egress
configuration").

`erikdw` approved the PR head `92c29e6898ab3b981dbdba21d9076cb7d69471c4` on 2026-10-12 at
23:02:13Z
([review 5496882120](https://github.com/braintrustdata/terraform-aws-braintrust-data-plane/pull/405#pullrequestreview-5496882120), no body), and `alexr17`
squash-merged it into `main` 34 seconds later, at 23:02:47Z, as
`8ce5e25046931eb3e19b8eb3473cdb0d462512f6`, whose one parent is `9c6648dffd`, not the merge
base. The merged tree has the reviewer's two-set subnet layout. No revert followed: `main` has 32
commits after the merge and none reverts it; the five that touch the two modules' folders
are #434, #435 and #462 and two version bumps (`0bff273`, `92f5fc6`), and `aws_subnet.egress_gateway`
is still in `modules/loop-runtime-sandbox-aws-microvm/main.tf` at `main`'s tip, `52a5dee`.

## Reviews ignored

- Bot reviews: 6 `COMMENTED` by `chatgpt-codex-connector[bot]`, at `46c9fe9`, `cec3b5f`,
  `fb60fb2`, `632f0da`, `8d751e3` and `5ebe900`, and 3 bot issue comments from it (a review
  summary and two "Didn't find any major issues").
- Other human reviews: `jeffmccollum` (CONTRIBUTOR), 1 `COMMENTED` on 2026-10-05 at `8374f7d`,
  one inline thread on `variables.tf` asking that `loop_runtime_sandbox_egress_mode` stay with a
  validation that allows only `restricted` (the author did so in `33f7e81`); `alexbasista-bt`, an
  issue comment on 2026-10-09 suggesting the module manage the DNS Firewall for a supplied sandbox
  VPC, which is a design suggestion and no review. `erikdw`'s other reviews: the `COMMENTED` one
  quoted above, a second `COMMENTED` with no body carrying one thread reply on
  `loop_runtime_version_override` (2026-10-09), 1 `DISMISSED` at `a0aefff` (2026-10-12, body
  ":shipit:"), and the `APPROVED` at `92c29e6`.
- Reviews by the PR's author: 14 `COMMENTED` by `alexr17`, all thread replies, and 8 issue comments
  that only say `@codex review`.
