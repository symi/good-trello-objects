'use strict';
module.exports = function (List, GoodCard) {
    class GoodList extends List {
        constructor(list, parentBoard) {
            super(list);
            this._parentBoard = parentBoard;
            this._pages = GoodCard.getBulk({
                cards: (list.cards || []).filter(c => c.idList === list.id)
            }, parentBoard);          
        }
        
        *getCards(recursive) {
            if (!Array.isArray(this._pages)) {
                this._pages = yield* GoodCard.getAll(this.id, this._parentBoard, recursive);            
            } 
            
            return this._pages; 
        }
        
        *getOrAddCard(name) {
            throw new Error('Not yet implemented');
        }
        
        static *getOrAdd(boardId, name, recursive) {
            throw new Error('Not yet implemented');
        }
        
        static *get(boardId, name, recursive) {
            throw new Error('Not yet implemented');
        }
        
        static *add(boardId, name) {
            throw new Error('Not yet implemented');
        }
        
        static *getAll(parentBoard, recursive) {
            let lists = yield* super.getAll(parentBoard.id, recursive); // returns normal cards not goodcards.
            return lists.map(l => new GoodList(l, parentBoard)); 
        }
        
        static getBulk(bulkData, parentBoard) {
            if (!Array.isArray(bulkData.lists)) return;
            return bulkData.lists.map(l => new GoodList(l, parentBoard));
        }
    }
    
    return GoodChecklist;
};