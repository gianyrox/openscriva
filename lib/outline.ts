import type { Book, OutlineNode } from "@/types";

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function createDefaultOutline(book: Book): OutlineNode {
  const root: OutlineNode = {
    id: generateId(),
    type: "book",
    title: book.title,
    status: "draft",
    children: [],
  };

  for (const part of book.parts) {
    const partNode: OutlineNode = {
      id: generateId(),
      type: "part",
      title: part.title,
      status: "draft",
      children: [],
    };

    for (const chapter of part.chapters) {
      const chapterNode: OutlineNode = {
        id: chapter.id || generateId(),
        type: "chapter",
        title: chapter.label,
        status: "idea",
        file: chapter.file,
        children: [],
      };
      partNode.children!.push(chapterNode);
    }

    root.children!.push(partNode);
  }

  return root;
}

export function findNode(
  outline: OutlineNode,
  id: string,
): OutlineNode | null {
  if (outline.id === id) return outline;
  if (outline.children) {
    for (const child of outline.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateNode(
  outline: OutlineNode,
  id: string,
  updates: Partial<OutlineNode>,
): OutlineNode {
  if (outline.id === id) {
    return { ...outline, ...updates };
  }
  if (outline.children) {
    return {
      ...outline,
      children: outline.children.map(function mapChild(child) {
        return updateNode(child, id, updates);
      }),
    };
  }
  return outline;
}

export function addChild(
  outline: OutlineNode,
  parentId: string,
  child: OutlineNode,
): OutlineNode {
  if (outline.id === parentId) {
    return {
      ...outline,
      children: [...(outline.children || []), child],
    };
  }
  if (outline.children) {
    return {
      ...outline,
      children: outline.children.map(function mapChild(c) {
        return addChild(c, parentId, child);
      }),
    };
  }
  return outline;
}

export function removeNode(
  outline: OutlineNode,
  id: string,
): OutlineNode {
  if (outline.children) {
    return {
      ...outline,
      children: outline.children
        .filter(function filterChild(child) {
          return child.id !== id;
        })
        .map(function mapChild(child) {
          return removeNode(child, id);
        }),
    };
  }
  return outline;
}

export function moveNode(
  outline: OutlineNode,
  nodeId: string,
  newParentId: string,
  newIndex: number,
): OutlineNode {
  const node = findNode(outline, nodeId);
  if (!node) return outline;

  const nodeCopy: OutlineNode = { ...node };
  const withoutNode = removeNode(outline, nodeId);

  function insertAtIndex(tree: OutlineNode): OutlineNode {
    if (tree.id === newParentId) {
      const children = [...(tree.children || [])];
      children.splice(newIndex, 0, nodeCopy);
      return { ...tree, children };
    }
    if (tree.children) {
      return {
        ...tree,
        children: tree.children.map(insertAtIndex),
      };
    }
    return tree;
  }

  return insertAtIndex(withoutNode);
}

export function reorderChildren(
  outline: OutlineNode,
  parentId: string,
  oldIndex: number,
  newIndex: number,
): OutlineNode {
  if (outline.id === parentId) {
    const children = [...(outline.children || [])];
    const [moved] = children.splice(oldIndex, 1);
    children.splice(newIndex, 0, moved);
    return { ...outline, children };
  }
  if (outline.children) {
    return {
      ...outline,
      children: outline.children.map(function mapChild(child) {
        return reorderChildren(child, parentId, oldIndex, newIndex);
      }),
    };
  }
  return outline;
}

export function outlineToJson(node: OutlineNode): string {
  return JSON.stringify(node);
}

export function jsonToOutline(json: string): OutlineNode {
  return JSON.parse(json) as OutlineNode;
}

export function getParentId(
  outline: OutlineNode,
  nodeId: string,
): string | null {
  if (outline.children) {
    for (const child of outline.children) {
      if (child.id === nodeId) return outline.id;
      const found = getParentId(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}
