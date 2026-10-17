# Questions a visitor might ask

Answers by Codex on eresuntomatito's behalf. These are anticipated reading and setup questions, not a claim that community members have already asked them.

## Why does this exist?

Luis describes it as curiosity and the joy of building, not a tool required to be useful. The point is to shape conditions and watch a world develop, including outcomes that were not requested. Read the [whole-world guide](world-guide.md) and [short history](history.md).

## Will cloning it give me the world in the picture?

No. The code, historical reports, and a continuing world's saved state are different artifacts. A fresh run starts with 150 wanderers at the checked revision and only its initial rollout schedule. It does not recreate the README's population or completed terrain. Use the [running guide](../RUNNING.md). Luis has authorized one reviewed latest-publication save; its [delivery record](../WORLD-SNAPSHOT-PROPOSAL.md) distinguishes approval from an actual downloadable artifact. There is no recurring snapshot service.

## Does it need Claude or a local model to run?

The documented model-free path pauses queued model work while the simulation continues. Inherited variation and splitting still happen. The local model and file-based Claude bridge are separate integrations, not prerequisites for that path. The pause flag is not a universal safety switch for every explicit endpoint; follow the [running guide](../RUNNING.md) and use a separate local checkout.

## Why is my world not evolving a predator?

The rules allow possibilities rather than promise milestones. Hunting depends on encounters, jaws, body size, defence, yield, behaviour, costs, and reproduction. A changed rule that lowers one barrier does not supply all the other requirements. The [history](history.md) includes both increased hunting and later prey loss, as well as apex rules that had not produced an apex at their reporting checkpoint.

## Is a high trait average proof of an adaptation?

No. Identify what the field measures, which bodies were included, and what survival/reproduction evidence exists. Inherited armour is not necessarily effective armour; a recent-diet label is not a fixed species class. See [trait categories](traits/README.md), [armour](traits/armour.md), and [selection and variation](selection-and-variation.md).

## Are the species real biological species?

They are this model's named lineages under implemented compatibility, splitting, and naming rules. A new name or a rising species count is not itself proof of biological reproductive isolation. An [ancestry diagram](species/mosali.md) also does not tell you where the bodies are; the [atlas](species/atlas.md) answers that separate, dated question.

## Does green mean healthy or stable?

Not by itself. The README image was selected for natural visible greenery, not as a productivity or stability measurement. Food quality, accessibility, crowding, lineage survival, and costs are separate matters. Its [capture provenance](../assets/README.md) records what was actually observed.

## I found a bug, a surprising event, or an idea. Where does it go?

Open an [issue in the project repository](https://github.com/eresuntomatito/terrarium-seasons-of-wonder/issues). For a report, include the source revision, whether this is a fresh or continued world, the season/tick if available, what you expected, what happened, and relevant browser/server errors. A screenshot can help but is not a substitute for those details. Do not upload credentials, private logs, or a complete save without reviewing its contents.

Suggestions are welcome without creating a promise to implement them. Codex can investigate and improve documentation; world-rule and code proposals go to Claude's stewardship, and project-direction choices go to Luis. Replies written by Codex through the account should say so. There is no guaranteed response time or permanent unattended monitoring; see [community practice](../COMMUNITY.md).

## Who should receive credit?

Luis shapes direction and conditions; Claude's stewardship includes implementation and reports; local-model novelty has its own historical role. Codex documents and publishes the world, and the viewer session also uses Codex. Luis confirms these are the only two Codex contexts. Do not treat Git author identity as proof of who wrote the code. See the [attributed interview and evidence follow-up](../STEWARD-INTERVIEW.md).
