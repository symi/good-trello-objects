'use strict';
module.exports = function (Board, GoodList) {
    class GoodBoard extends Board {
        constructor(board) {
            super(board);
            this._modules = GoodList.getBulk(board, this);
        }
        
        *getLists(recursive) {
            if (!Array.isArray(this._modules)) {
                this._modules = yield* GoodList.getAll(this, recursive);
            }

            return this._modules; 
        }
        
        *iterateAllCards(callbackFn, context) {        
            for (let l of yield* this.getLists()) {
                for (let c of yield* l.getCards()) {
                    callbackFn.call(context, c);
                }
            }
        }
        
        static *getBulk(name) {
            let partialBoard = yield* super.getOrAdd(name),
                bulkData = yield* super.getRawBulk(partialBoard),
                board = new GoodBoard(bulkData),
                allCards = [];
                
            yield* board.iterateAllCards(c => allCards.push(c));
            
            for (let card of allCards) {
                yield* card._populateCard(); // ugh...
            }
            
            return board;
        }
    }
    
    return GoodBoard;
};