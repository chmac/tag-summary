import type { Match } from "main";
import { CachedMetadata, ListItemCache, TagCache } from "obsidian";

export function getLines(
	lines: string[],
	startLine: number,
	endLine: number
): Match {
	const content = lines.slice(startLine, endLine + 1).join("\n");
	return { startLine, endLine, content };
}

// NOTE: See docs on ListItemCache.parent here:
// https://docs.obsidian.md/Reference/TypeScript+API/ListItemCache/parent
export function getParentListItem(
	listItems: ListItemCache[],
	targetIndex: number
): ListItemCache {
	const listItem = listItems[targetIndex];

	const isRootLevelListItem = listItem.parent < 0;
	const isFirstListItem = targetIndex === 0;
	if (isRootLevelListItem || isFirstListItem) {
		return listItem;
	}

	const listItemsBeforeTarget = listItems.slice(0, targetIndex - 1);
	const parentIndex = listItemsBeforeTarget.findLastIndex(
		({ parent }) => parent < 0
	);

	// This is an error case, the parent should never not exist
	if (parentIndex === -1) {
		return listItem;
	}

	const parentListItem = listItems[parentIndex];
	return parentListItem;
}

// NOTE: See docs on ListItemCache.parent here:
// https://docs.obsidian.md/Reference/TypeScript+API/ListItemCache/parent

export function getMatchAndChildren(
	tagCache: TagCache,
	lines: string[],
	listItems: NonNullable<CachedMetadata["listItems"]>
) {
	const startLine = tagCache.position.start.line;
	const endLine = tagCache.position.end.line;

	if (listItems.length === 0) {
		throw new Error("#NwbrNh-listItems-empty-array");
	}

	// Is this tag a list item?
	const index = listItems.findIndex(
		(listItem) => listItem.position.start.line === startLine
	);

	const isListItem = index > -1;

	if (!isListItem) {
		return getLines(lines, startLine, endLine);
	}

	const startingListItem = getParentListItem(listItems, index);

	// Find the next item which has an index higher than the current target and
	// also has a parent value less than zero (making it a root list item)
	const nextSiblingListItemIndex = listItems.findIndex(
		({ parent }, i) => i > index && parent < 0
	);

	const hasNoNextSibling = nextSiblingListItemIndex === -1;
	if (hasNoNextSibling) {
		// Return all list items from the target to the end of the array
		return getLines(
			lines,
			startingListItem.position.start.line,
			// NOTE: We can safely assert that `.last()` will return a value because
			// we test above to ensure this array has >0 elements.
			listItems.last()!.position.end.line
		);
	}

	const lastListItemInThisBlock = listItems[nextSiblingListItemIndex - 1];

	return getLines(
		lines,
		startingListItem.position.start.line,
		lastListItemInThisBlock.position.end.line
	);
}
