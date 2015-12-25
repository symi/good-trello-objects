'use strict';
// links
// converted, tested
// state = waiting dev, in dev, waiting testing, in testing, waiting fixes, done
// cleanStart
// dialog service
// diff = identical / new
// 3rd party integration
// points
// code reviewed
// testing {browser, themes, rounds: []}
   
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
            this._converted = parseLabels()
        }
        
        get usages() {
            return this._links.length;
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
        
        static *getOrAdd(listId, title, script, type, recursive) {            
            let card = yield* super.getOrAdd(listId, createName(title, script, type), recursive);
            
            return new GoodCard(card.raw);
        }
        
        static *add(listId, title, script, type) {
            let card = yield* super.add(listId, createName(title, script, type));
            
            return new GoodCard(card.raw);
        }
    }
    
    return GoodCard;
};