const createEnum = require('../utilities/createEnum');
module.exports = createEnum(['WaitingDev', 'InDev', 'WaitingTesting', 'InTesting', 'WaitingFixes', 'Done', 'Invalid']);