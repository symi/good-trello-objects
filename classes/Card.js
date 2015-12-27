'use strict';
// links

const State = {},
    Diff = {},
    browsers = ['IE11', 'Edge', 'FF', 'Chrome', 'Safari'],
    themes = ['Light', 'Dark'];
    
(function () {
    function createEnum(obj, props) {
        props.forEach((v, i) => {
            obj[obj[v] = i] = v;
        });
    } 
    
    const states = ['WaitingDev', 'InDev', 'WaitingTesting', 'InTesting', 'WaitingFixes', 'Done', 'Invalid'],
        diffs = ['Identical', 'New'];
        
    createEnum(State, states);
    createEnum(Diff, diffs);
})();
   
function parseTitle(name) {
    return (name.match(/^([^\s]+)/g) || [''])[0];
}

function parseScript(name) {
    return (name.match(/<(.*?)>/g) || [''])[0].replace(/(<|>)/g,'');
}

function parseType(name) {
    return (name.match(/\[(.*?)\]/g) || [''])[0].replace(/(\[|\])/g,'');
}

function parseLinks(description) {
    
}

function parseTrails(description) {
    return description.match(/^\/.+\.(asp|vbs|js)/gm) || [];
}

function parseUserDescription(description) {
    return description.split('***')[1] || '';
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

module.exports = function (Card, Checklist) {
    class GoodCard extends Card {
        constructor(goodCard) {
            super(goodCard);
            this.title = parseTitle(this.name);
            this.script = parseScript(this.name);
            this.type = parseType(this.name);
            this._links = parseLinks(this.getDescription()); 
            this._trails = parseTrails(this.getDescription());
            this._userDescription = parseUserDescription(this.getDescription());
            this._tester = undefined;
            this._developer = undefined;
            this._assignees = parseAssignees(this.getDescription());
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
                    if (!!checkItem.complete) {
                        this._tested = false;
                        break;
                    }
                }
                
                if (!!this._tested) break;
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
            //TODO: define this._parentBoard
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
            this._tester = yield this.getOrAddMember(member);
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
            this._developer = yield this.getOrAddMember(member);
            yield* this.setDescription();
            return this._tester;
        }
        
        *getTesting() {
            if (this._testing != null) return this._testing;
            
            let checklists = yield* this.getChecklists(true),
                browsersChecklist = checklists.find(c => c.name === 'Browsers'),
                browsersCheckItems = (browsersChecklist && (yield* browsersChecklist.getCheckItems())) || [],
                themesChecklist = checklists.find(c => c.name === 'Theme'),
                themesCheckItems = (themesChecklist && (yield* themesChecklist.getCheckItems())) || [],
                testingChecklists = checklists.filter(c => c.name.includes('Testing')).sort((a, b) => parseInt(a.name.replace('Testing ', ''), 10) - parseInt(b.name.replace('Testing ', ''), 10)), //TODO make a test cycle class!
                rounds = [];
             
            for (let round of testingChecklists) {
                let testItems = yield* round.getCheckItems();
                rounds.push(testItems.map(t => t.name));
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
            this._userDescription = (userDescription == null) ? this._userDescription : userDescription;            
            let description = `Developer: @${yield* this.getDeveloper()} | Tester: @${yield* this.getTester()}
            Number of other usages: ${this.usages}`;
            
            if (this._links.length) {
                description = `${description}
                ${this._links.map(l => `${l.url} (${yield l.getList()})`).join('\n')}`;                
            }
            
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
            
            super.setDescription(description);
        }
        
        getTrails() {
            return this._trails;
        }
        
        *setTrails(trails) {
            this._trails = trails;
            yield* this.setDescription();  
        }        
        
        // TODO add any async gets to the below methods, getTester/getDeveloper/getConverted etc.
        static *getOrAdd(listId, title, script, type, recursive) {            
            let card = yield* super.getOrAdd(listId, createName(title, script, type), recursive);
            
            return new GoodCard(card.raw);
        }
        
        //TODO add get method.
        
        static *add(listId, title, script, type) {
            let card = yield* super.add(listId, createName(title, script, type));
            // todo: setup basic good trello props... checklists, desc.
            return new GoodCard(card.raw);
        }
        
        //TODO add getAll
        
        //TOD add getBulk
        
        static get States() {
            return State;
        }
    }
    
    return GoodCard;
};