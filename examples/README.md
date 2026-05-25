# Examples

Sample books and expected extraction outputs. **All texts are public-domain from [Project Gutenberg](https://www.gutenberg.org/).**

| Book | Author, Year | Words | Use |
|---|---|---|---|
| Alice's Adventures in Wonderland | Lewis Carroll, 1865 | ~27 000 | Full end-to-end demo |
| The Yellow Wallpaper | Charlotte Perkins Gilman, 1892 | ~6 000 | Fast smoke test |

Texts are added in PR #3 along with the first runnable pipeline.

## Why these two

- **Alice** has a rich, well-studied cast (LitBank includes excerpts) and a fantasy register that stress-tests entity typing (Agent: White Rabbit; Object: bottle marked DRINK ME; Event: the trial).
- **The Yellow Wallpaper** has exactly one main agent with rapidly evolving mental state — perfect for validating Pass-6 GLUCOSE emotion / attribute dimensions.

Both are short enough to run end-to-end in development without burning meaningful API spend.
