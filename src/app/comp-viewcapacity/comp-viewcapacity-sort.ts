  /*
  sortProjectsByCost(capacity:VisboCapacity[]): VisboCapacity[] {
      // ------- SORT by sum value -------
      const groupKey = (value: VisboCapacity) => value.name;
      const sumValue = (value: VisboCapacity) => value.plannedCost_PT + value.actualCost_PT;
      const capacityChildGroupedByProject = capacity.reduce((accumulator, elem) => {
        const key = groupKey(elem);
        if (!accumulator.has(key)) {
          accumulator.set(key, {sum: 0, elems: []});
        }
        accumulator.get(key).elems.push(elem);
        accumulator.get(key).sum += sumValue(elem);
        return accumulator;
      }, new Map<string, {sum: number; elems: VisboCapacity[]}>());

      // console.log(capacityChildGroupedByProject);

      const sortedValues = Array.from(capacityChildGroupedByProject.values())
              .sort((a, z) => z.sum - a.sum);
              //.sort((a, z) => z.sum/z.elems.length - a.sum/a.elems.length);
      const sortedArray = sortedValues.map((item) => item.elems);
      const flatArray = [].concat([], ...sortedArray);
      // console.log(sortedValues);
      const sortedProjects: VisboCapacity[] = flatArray;
      return sortedProjects;
      // ------ SORT END ------
  }

  sortProjectsByBusinessUnit(capacity: VisboCapacity[]): VisboCapacity[] {
    const copiedCapacity = [...capacity];
    const sortedValues = copiedCapacity.sort((a, z) => {
      const zVP = this.listVP.find(item => item._id == z.vpid);
      const aVP = this.listVP.find(item => item._id == a.vpid);
      const zBU = getCustomFieldString(zVP, "_businessUnit")?.value || "zzzzzz";
      const aBU = getCustomFieldString(aVP, "_businessUnit")?.value || "zzzzzz";
      // sorts the businessUnit alphanumerical ascending
      if(aBU < zBU) { return -1; }
      if(aBU > zBU) { return 1; }
      // sorts the strategicFit descending
      const zStrategicFit = getCustomFieldDouble(zVP, "_strategicFit")?.value || -1;
      const aStrategicFit = getCustomFieldDouble(aVP, "_strategicFit")?.value || -1;
      if(aStrategicFit < zStrategicFit) { return 1; }
      if(aStrategicFit > zStrategicFit) { return -1; }
      // nur wenn gleich nach nächsten criterium sortieren
      // if (a.criterium3 < z.criterium3) { return -1;}
      // if (a.criterium3 > z.criterium3) { return 1;}
      return 0;
    });
    return sortedValues;
  }
  */
