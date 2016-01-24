'use strict';
module.exports = function (Checklist, GoodCheckItem) {
    class GoodChecklist extends Checklist {
        constructor(checklist) {
            super(checklist);
        }
        
        *getCheckItems() {            
            let checkItems = yield* super.getCheckItems();
            return checkItems.map(c => new GoodCheckItem(c.raw));       
        }
        
        *getOrAddCheckItem(name, position) {           
            let checkItem = yield* super.getOrAddCheckItem(name, position);
            return new GoodCheckItem(checkItem.raw);
        }
        
        static *getOrAdd(cardId, name, recursive) {
            let checklist = yield* super.getOrAdd(cardId, name, recursive);
            return new GoodChecklist(checklist.raw);
        }
        
        static *get(cardId, name, recursive) {
            let checklist = yield* super.get(cardId, name, recursive);
            return new GoodChecklist(checklist.raw);       
        }
        
        static *add(cardId, name) {
            let checklist = yield* super.add(cardId, name);
            return new GoodChecklist(checklist.raw);
        }
        
        static *getAll(cardId, recursive) {
            let checklists = yield* super.getAll(cardId, recursive);
            
            return checklists
                .map(c => {
                    let checklist = new GoodChecklist(c);               
                    if (recursive) checklist.getCheckItems();
                    return checklist;
                });   
        }
        
        static getBulk(bulkData) {
            return bulkData.checklists.map(c => {
                let checklist = new GoodChecklist(c);
                checklist._checkItems = GoodCheckItem.getBulk({
                    checkItems: c.checkItems
                });            
                return checklist;
            });
        }
    }
    
    return GoodChecklist;
};