import {expect,it} from 'vitest';
import {versionComparisonDefaults} from './versionComparison';
const versions=[{id:30,version:3},{id:10,version:1},{id:20,version:2}];
it('compares the latest or selected draft with a distinct adjacent draft',()=>{
 expect(versionComparisonDefaults(versions,30)).toEqual({leftId:20,rightId:30});
 expect(versionComparisonDefaults(versions,20)).toEqual({leftId:10,rightId:20});
 expect(versionComparisonDefaults(versions,10)).toEqual({leftId:20,rightId:10});
});
it('falls back to the latest version when the old selection is unavailable',()=>{
 expect(versionComparisonDefaults(versions,99)).toEqual({leftId:20,rightId:30});
 expect(versionComparisonDefaults(versions,null)).toEqual({leftId:20,rightId:30});
});
