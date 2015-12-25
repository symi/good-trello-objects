'use strict';
    
function goodTrelloObjects (key, token) {
    const trello = require('trello-objects')(key, token),
        goodTrello = {};
    
    goodTrello.CheckItem = require('./classes/CheckItem')(trello.CheckItem);
    goodTrello.Checklist = require('./classes/Checklist')(trello.Checklist, goodTrello.CheckItem);
    goodTrello.Card = require('./classes/Card')(trello.Card, goodTrello.Checklist);
    goodTrello.List = require('./classes/List')(trello.List, goodTrello.Card);
    goodTrello.Board = require('./classes/Board')(trello.Board, goodTrello.List); 
    
    return goodTrello;
}

module.exports = goodTrelloObjects;