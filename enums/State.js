const createEnum = require('../utilities/createEnum');
module.exports = createEnum(['Invalid', 'WaitingDev', 'InDev', 'WaitingTesting', 'InTesting', 'WaitingFixes', 'Done']);