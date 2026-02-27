# Summarise Prompts v1

Version: `v1`

## Files

- `main.mustache` - Primary synthesis prompt template

## Template Variables

| Variable | Type | Description |
|----------|------|-------------|
| `question` | string | The question being synthesised |
| `responses` | array | List of expert responses |
| `responses[].id` | string | Anonymised expert identifier |
| `responses[].claims` | array | Claims made by the expert |
| `responses[].evidence` | array | Evidence provided |
| `responses[].uncertainties` | array | Uncertainties flagged |

## Version History

- **v1** (initial): Basic synthesis prompt with traceability requirements

## Usage

The `prompt_version` field in synthesis artefacts references this version string.
Templates are loaded at runtime from `prompts/summarise/{version}/`.



