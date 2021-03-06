'use strict';
const Browsers = require('../enums/Browsers');

function parseBrowsers(name) {
    let browsers = name.match(/{(.+?)}|/g)
            .map(m => Browsers[m])
            .filter(b => b !== undefined);
                        
    // undefined means 'All'
    if (!browsers.length) browsers = undefined;
    return browsers;
}

function parseBug(name) {
    let bug = name.split('}|');
    return (bug.length > 1 ? bug[1] : bug[0]);
}

function generateName(bug, browsers) {
    let name = bug;
    
    if (Array.isArray(browsers) && browsers.length) {
        let browserString = '';
        browsers.forEach(b => {
            browserString += `{${Browsers[b]}}`;
        });
        name = `${browserString}|${name}`;
    }
    
    return name;
}

module.exports = function (CheckItem) {
    class GoodCheckItem extends CheckItem {
        constructor(checkItem) {
            super(checkItem);
            this.browsers = parseBrowsers(this.name);  
            this.bug = parseBug(this.name);                      
        }
        
        static *getOrAdd(checklistId, bug, browsers, position) {            
            let checkItem = yield* super.getOrAdd(checklistId, generateName(bug, browsers), position);
            
            return new GoodCheckItem(checkItem.raw);
        }
        
        static *get(checklistId, bug) {
            let checkItems = yield* CheckItem.getAll(checklistId);
            
            return checkItems
                .map(ci => new GoodCheckItem(ci.raw))
                .find(ci => ci.bug === bug);       
        }
        
        static *add(checklistId, bug, browsers, position) {
            let checkItem = yield* super.add(checklistId, generateName(bug, browsers), position);            
            return new GoodCheckItem(checkItem.raw);
        }
        
        static *getAll(checklistId) {
            let checkItems = yield* super.getAll(checklistId);
            return checkItems
                .map(c => new GoodCheckItem(c.raw));   
        }
        
        static getBulk(bulkData) {
            if (!Array.isArray(bulkData.checkItems)) return;
            return bulkData.checkItems.map(c => new GoodCheckItem(c));
        }
    }
    
    return GoodCheckItem;
};