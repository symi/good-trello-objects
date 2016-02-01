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
        
        *iterateAllCards(callbackFn) {        
            for (let list of yield* this.getLists()) {
                for (let card of yield* list.getCards()) {
                    yield* callbackFn(card);
                }
            }
        }
        
        static *getBulk(name) {
            let partialBoard = yield* super.getOrAdd(name),
                bulkData = yield* super.getRawBulk(partialBoard),
                board = new GoodBoard(bulkData);
                
            yield* board.iterateAllCards(function* (card) {
                yield* card._populateCard();
            });
            
            return board;
        }
    }
    
    return GoodBoard;
};