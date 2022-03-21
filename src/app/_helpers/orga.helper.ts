// functions to build and manipulate the orga tree

import { VisboReducedOrgaItem, VisboOrgaStructure, VisboOrgaTreeLeaf, TreeLeafSelection } from '../_models/visbosetting';

export function buildOrgaTree(allRoles: VisboReducedOrgaItem[]): VisboOrgaStructure {
  const tree = new VisboOrgaTreeLeaf();
  tree.uid = 0;
  tree.name = 'root';
  tree.parent = null;
  tree.children = [];
  tree.showChildren = true;

  // calculate an indexed role list with Childs
  const indexedRoles: VisboOrgaTreeLeaf[] = [];
  allRoles.forEach(role => {
    const newLeaf = new VisboOrgaTreeLeaf();
    newLeaf.uid = role.uid;
    newLeaf.name = role.name;
    newLeaf.children = [];
    if (role.pid) {
      newLeaf.parent = indexedRoles[role.pid];
      newLeaf.showChildren = false;
      indexedRoles[role.pid].children.push(newLeaf);
    } else {
      newLeaf.parent = tree;
      newLeaf.showChildren = true;
      tree.children.push(newLeaf);
    }
    indexedRoles[role.uid] = newLeaf;
  });

  const result = new VisboOrgaStructure();
  result.tree = tree;
  result.list = indexedRoles;
  return result;
}

export function expandParentTree(leaf:VisboOrgaTreeLeaf): void {
  if (leaf.parent === null) return;
  leaf.parent.showChildren = true;
  expandParentTree(leaf.parent);
}

export function setTreeLeafSelection(leaf: VisboOrgaTreeLeaf, value: TreeLeafSelection): void {
  leaf.isSelected = value;
  if (!leaf.children || leaf.children.length === 0) {
    return;
  }
  leaf.children.forEach((child) => {
    setTreeLeafSelection(child, value === TreeLeafSelection.SELECTED ? TreeLeafSelection.PARENT_SELECTED : value);
  });
}

export function getLeafByID(orga: VisboOrgaStructure, roleID: number): VisboOrgaTreeLeaf {
  let leaf: VisboOrgaTreeLeaf;
  if (roleID >= 0) {
    leaf = orga?.list[roleID];
  }
  if (!leaf) {
    leaf = orga?.tree.children[0];
  }
  return leaf;
}

export function getLeafByName(orga: VisboOrgaStructure, roleName: string): VisboOrgaTreeLeaf {
  const leaf = orga?.list.find(role => role?.name == roleName);
  return leaf;
}

export function isParentLeaf(leaf: VisboOrgaTreeLeaf): boolean {
  let result = false;
  if (leaf?.parent?.parent == null) {
    result = true;
  }
  return result;
}
