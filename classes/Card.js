'use strict';
const State = require('../enums/State'),
    Diff = require('../enums/Diff'),
    Browsers = require('../enums/Browsers'),
    browsers = Object.keys(Browsers).filter(key => Number.isNaN(+key)),
    Themes = require('../enums/Themes'),
    themes = Object.keys(Themes).filter(key => Number.isNaN(+key));
   
function parseTitle(name) {
    let parts = name.split(' <');
    return (parts.length > 1 ? parts[0] : '');
}

function parseScript(name) {
    return (name.match(/<(.*?)>/g) || [''])[0].replace(/(<|>)/g,'');
}

function parseType(name) {
    return (name.match(/\[(.*?)\]/g) || [''])[0].replace(/(\[|\])/g,'');
}

function parseTrails(description) {
    return description.match(/^\/.+\.(asp|vbs|js)/gm) || [];
}

function parseUserDescription(description) {
    let parts = description.split('***');
    return (parts[1] || '').replace(/^(\s*)/g, '');
}

function parseAssignees(description) {
    return {
        developer: (description.match(/Developer:(.*)\|/g) || [''])[0].replace(/(Developer:\s*@|\s*\|)/g, ''),
        tester: (description.match(/Tester:(.*)$/gm) || [''])[0].replace(/Tester:\s*@/g, '')
    }
}

function parseLabels(labels, ...targets) {
    let match;
    targets.some(t => {
        match = labels.find(l => l.name === t);
        return !!match;
    });
    
    if (match) match = match.name;
    return match;
}

function createName(title, script, type) {
    let name = `${title} <${script}>`;
            
    if (type) {
        name = `${name} [${type}]`;
    }
    
    return name;
}

module.exports = function (Card, GoodChecklist) {
    class GoodCard extends Card {
        constructor(goodCard, parentBoard) {
            super(goodCard);
            let generatedDescription = this.getDescription().split('***')[0];
            this._parentBoard = parentBoard;
            this.title = parseTitle(this.name);
            this.script = parseScript(this.name);
            this.type = parseType(this.name);
            this._links = undefined; 
            this._trails = parseTrails(generatedDescription);
            this._userDescription = parseUserDescription(this.getDescription());
            this._tester = undefined;
            this._developer = undefined;
            this._assignees = parseAssignees(generatedDescription);
            this._converted = undefined;
            this._tested = undefined;
            this._state = undefined;
            this._cleanStart = undefined;
            this._dialogService = undefined;
            this._3rdParty = undefined;
            this._codeReviewed = undefined;
            this._points = undefined;
            this._diff = undefined;
            this._testing = undefined;
        }
        
        get usages() {
            return this._links.length;
        }
        
        *getLinks() {            
            if (this._links != null) return this._links;
            let cardsOnBoard = [];
            
            yield* this._parentBoard.iterateAllCards(function* (card) {
                cardsOnBoard.push(card);
            });
             
            let linkLines = (this.getDescription().split('***')[0].match(/^https:\/\/trello\.com\/c\/.+\(.+\)$/gm) || []);
            
            this._links = linkLines
                .map(line => (/\/c\/(.+)\//g.exec(line) || ['', ''])[1].toLowerCase())
                .filter(shortLink => shortLink !== '')
                .map(shortLink => cardsOnBoard.find(c => c.shortLink.toLowerCase() === shortLink))
                .filter(link => link !== undefined);
                
            return this._links;            
        }
        
        addLink(card) {
            this._links.push(card);
        }
        
        *updateLinks() {
            let cardsOnBoard = [];
            
            yield* this._parentBoard.iterateAllCards(function* (card) {
                cardsOnBoard.push(card);
            });
            
            this._links = cardsOnBoard.filter(c => (c.script === this.script && c !== this));
            
            yield* this.setDescription();
            
            for (let link of this._links) {
                link.addLink(this);
                yield* link.setDescription();
            }
        }
        
        *getConverted() {
            if (this._converted != null) return this._converted;
            this._converted = !!parseLabels(yield* this.getLabels(), 'converted');
            return this._converted;
        }
        
        *getTested() {
            if (this._tested != null) return this._tested;
            
            this._tested = true;
            
            for (let checklist of yield* this.getChecklists(true)) {
                for (let checkItem of yield* checklist.getCheckItems()) {
                    if (!checkItem.complete) {
                        this._tested = false;
                        break;
                    }
                }
                
                if (!this._tested) break;
            }
            
            return this._tested;
        }
        
        *getCleanStart() {
            if (this._cleanStart != null) return this._cleanStart;            
            this._cleanStart = !!parseLabels(yield* this.getLabels(), 'reverted to original');
            return this._cleanStart;
        }
        
        *getDialogService() {
            if (this._dialogService != null) return this._dialogService;            
            this._dialogService = !!parseLabels(yield* this.getLabels(), 'dialog service');
            return this._dialogService;
        }
        
        *get3rdParty() {
            if (this._3rdParty != null) return this._3rdParty;            
            this._3rdParty = !!parseLabels(yield* this.getLabels(), '3rd party integration');
            return this._3rdParty;
        }
        
        *getCodeReviewed() {
            if (this._codeReviewed != null) return this._codeReviewed;            
            this._codeReviewed = !!parseLabels(yield* this.getLabels(), 'code reviewed');
            return this._codeReviewed;
        }
        
        *getPoints() {
            if (this._points != null) return this._points;
            let label = parseLabels(yield* this.getLabels(), '5', '4', '3', '2', '1');
            this._points = (label != null) ? parseInt(label, 10) : undefined;
            return this._points;
        }
        
        *getDiff() {
            if (this._diff != null) return this._diff;
            let label = parseLabels(yield* this.getLabels(), 'diff - new', 'diff - identical');
            
            if (label === 'diff - new') {
                this._diff = Diff.New;
            } else if (label === 'diff - identical') {
                this._diff = Diff.Identical;
            }
            
            return this._diff;
        }
        
        *setDiff(diff) {
            let labels = yield* this._parentBoard.getLabels();
            if (diff === Diff.New) {
                this._diff = Diff.New;                
                yield* this.getOrAddLabel(labels.find(l => l.name === 'diff - new'));
            } else if (diff === Diff.Identical) {
                this._diff = Diff.Identical;
                yield* this.getOrAddLabel(labels.find(l => l.name === 'diff - identical'));
            }            
        }   
        
        *getState() {
            if (this._state != null) return this._state;
            
            let tested = yield* this.getTested(),
                converted = yield* this.getConverted(),
                label = parseLabels(yield* this.getLabels(), 'in development', 'in testing', 'needs retesting', 'needs fixing');
                
            if (!tested && !converted && !label) {
                this._state = State.WaitingDev;
            } else if (!converted && !tested && label === 'in development') {
                this._state = State.InDev;
            } else if (converted && !tested && (!label || label === 'needs retesting')) {
                this._state = State.WaitingTesting;
            } else if (converted && !tested && label === 'in testing') {
                this._state = State.InTesting;                
            } else if (converted && !tested && label === 'needs fixing') {
                this._state = State.WaitingFixes;
            } else if (converted && tested && !label) {
                this._state = State.Done;
            } else {
                this._state = State.Invalid;
            }
 
            return this._state;
        }
        
        *getTester() {
            if (this._tester) return this._tester;
            let members = yield* this.getMembers();
            this._tester = members.find(m => m.username === this._assignees.tester);
            return this._tester;
        }
        
        *setTester(member) {
            this._tester = yield* this.getOrAddMember(member);
            yield* this.setDescription();
            return this._tester;
        }
        
        *getDeveloper() {
            if (this._developer) return this._developer;
            let members = yield* this.getMembers();
            this._developer = members.find(m => m.username === this._assignees.developer);
            return this._developer;
        }
        
        *setDeveloper(member) {
            this._developer = yield* this.getOrAddMember(member);
            yield* this.setDescription();
            return this._tester;
        }
        
        *getTesting() {
            if (this._testing != null) return this._testing;
            
            let checklists = yield* super.getChecklists(true),
                browsersChecklist = checklists.find(c => c.name === 'Browsers'),
                browsersCheckItems = (browsersChecklist && (yield* browsersChecklist.getCheckItems())) || [],
                themesChecklist = checklists.find(c => c.name === 'Themes'),
                themesCheckItems = (themesChecklist && (yield* themesChecklist.getCheckItems())) || [],
                testingChecklists = checklists.filter(c => c.name.includes('Testing')).sort((a, b) => parseInt(a.name.replace('Testing ', ''), 10) - parseInt(b.name.replace('Testing ', ''), 10)), //TODO make a test cycle class!
                rounds = {};
            
            testingChecklists = testingChecklists.map(checklist => new GoodChecklist(checklist.raw));
            rounds.count = testingChecklists.length;
             
            for (let i = 0; i < testingChecklists.length; i++) {
                rounds[i + 1] = yield* testingChecklists[i].getCheckItems();                
            }
             
            this._testing = {
                browsers: browsers.reduce((obj, browser) => {
                    let browserCheckItem = browsersCheckItems.find(ci => ci.name === browser);
                    obj[browser.toLowerCase()] = (browserCheckItem) ? browserCheckItem.complete : undefined;
                    return obj;
                }, {}),
                themes: themes.reduce((obj, theme) => {
                    let themeCheckItem = themesCheckItems.find(ci => ci.name === theme);
                    obj[theme.toLowerCase()] = (themeCheckItem) ? themeCheckItem.complete : undefined;
                    return obj;
                }, {}),
                rounds: rounds
            };
            
            return this._testing;
        }
        
        *setDescription(userDescription) {
            yield* this.getLinks();
            this.getTrails();
            
            this._userDescription = (userDescription == null) ? this._userDescription : userDescription;  
            let developer = yield* this.getDeveloper(),
                tester = yield* this.getTester(),
                description = `Developer: ${(developer ? '@' + developer.username : 'none')} | Tester: ${(tester ? '@' + tester.username : 'none')}
Number of other usages: ${this.usages}`;
            
            let linkText = '';
            for (let l of this._links) {
                linkText += `\n${l.url} (${yield l.getListName()})`;
            }
            
            description += linkText;
            
            if (this._trails.length) {
                description = `${description}
                ${this._trails.join('\n')}`;
            }
            
            description = `${description}
***`;
            
            if (this._userDescription) {
                description = `${description}
${this._userDescription}`;
            }
            
            yield* super.setDescription(description);
        }
        
        getTrails() {
            return this._trails;
        }
        
        *setTrails(trails) {
            this._trails = trails;
            yield* this.setDescription();  
        }
        
        *_populateCard(recursive, bulk) {
            yield* this.getChecklists(recursive);
            yield* this.getMembers();
            yield* this.getLabels();
            if (!bulk) yield* this.getLinks(); // get links requires all other cards to exist
            yield* this.getConverted();
            yield* this.getTested();
            yield* this.getCleanStart();
            yield* this.getDialogService();
            yield* this.get3rdParty();
            yield* this.getCodeReviewed();
            yield* this.getPoints();
            yield* this.getDiff();
            yield* this.getState();
            yield* this.getTester();
            yield* this.getDeveloper();
            yield* this.getTesting(); 
        }
        
        *getChecklists(recursive) {
            let checklists = yield* super.getChecklists();
            return checklists.map(c => {
                let checklist = new GoodChecklist(c.raw);
                if (recursive) checklist.getCheckItems();
                return checklist;
            });
        }
        
        *getOrAddChecklist(name) {
            let checklist = yield* super.getOrAddChecklist(name);
            return new GoodChecklist(checklist.raw);
        }
        
        static *getOrAdd(listId, title, script, type, recursive) {
            let goodCard = GoodCard.get(listId, title, script, type, recursive); 
            if (goodCard) return goodCard;
            return GoodCard.add(listId, title, script, type);
        }
        
        static *get(listId, title, script, type, parentBoard, recursive) {
           let card = yield* super.get(listId, createName(title, script, type));
           if (!card) return;
           let goodCard = new GoodCard(card.raw, parentBoard);
           if (!recursive) return goodCard;
           yield* goodCard._populateCard(recursive);
           return goodCard;
        }
        
        static *add(listId, title, script, type, parentBoard) {
            let list = (yield* parentBoard.getLists()).find(l => l.id === listId);
            if (!list) return;
            
            let card = yield* list.getOrAddCard(createName(title, script, type)),
                goodCard = new GoodCard(card.raw, parentBoard),
                i = 0;         
                        
            yield* goodCard.setDescription();
            
            let cl = yield* goodCard.getOrAddChecklist('Browsers');
            yield* cl.setPosition(0);
            
            for (let browser of browsers) {
                yield* cl.getOrAddCheckItem(browser, i);
                // todo: update existing positions of checkitems?
                i++;
            }
            
            cl = yield* goodCard.getOrAddChecklist('Themes');
            yield* cl.setPosition(1);
            i = 0;
            
            for (let theme of themes) {
                yield* cl.getOrAddCheckItem(theme, i);
                i++;
            }
            
            cl = yield* goodCard.getOrAddChecklist('Testing 1');
            yield* cl.setPosition(3);
            
            return goodCard;
        }
        
        static *getAll(listId, parentBoard, recursive) {
            let cards = yield* super.getAll(listId),
                goodCards = [];
                
            for (let card in cards) {
               let goodCard = new GoodCard(card.raw, parentBoard);
               if (recursive) yield* goodCard._populateCard(recursive); // TODO issue around populateCard and bulk will have to run at end and build the full card list up locally.
               goodCards.push(goodCard);  
            }
            
            return goodCards;
        }
        
        // todo this is the completely wrong design. we need to call _populateCard but getBulk method shouldnt be async and need to deal with link issue.
        // see getBulk in board for the rest of the implementation that should be here.
        static getBulk(bulkData, parentBoard) {
            if (!Array.isArray(bulkData.cards)) return;        
            return bulkData.cards.map(c => new GoodCard(c, parentBoard));
        }
    }
    
    return GoodCard;
};