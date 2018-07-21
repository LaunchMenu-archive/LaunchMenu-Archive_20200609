var noopTimer = {
    start: function(){},
    elapsed: function(){ return 0; }
};
export default class ElectronReporter{
    constructor(options){
        console.log("constructor", arguments);
        this.timer = options.timer || noopTimer;
        this.status = 'loaded';

        this.started = false;
        this.finished = false;
        this.runDetails = {};

        this.executionTime;
        this.runDetails;
        this.suites = [];
        this.suitesHash = {};
        this.specs = [];
    }

    // General methods
    jasmineStarted(){
        console.log("jasmineStarted", arguments);
        this.started = true;
        this.status = 'started';
        this.timer.start();
    }
    jasmineDone(runDetails){
        console.log("jasmineDone", arguments);
        this.finished = true;
        this.runDetails = runDetails;
        this.executionTime = timer.elapsed();
        this.status = 'done';
    }
    status(){
        console.log("status", arguments);
        return this.status;
    }

    // Suite methods
    suiteStarted(result){
        console.log("suiteStarted", arguments);
        this.suitesHash[result.id] = result;
    }
    suiteDone(result){
        console.log("suiteDone", arguments);
        this.suites.push(result);
        this.suitesHash[result.id] = result;
    }
    suiteResults(index, length){
        console.log("suiteResults", arguments);
        return this.suites.slice(index, index+length);
    }
    suites(){
        console.log("suites", arguments);
        return this.suitesHash;
    }

    // Spec methods
    specDone(result){
        console.log("specDone", arguments);
        this.specs.push(result);
    }
    specResults(index, length){
        console.log("specResults", arguments);
        return this.specs.slice(index, index + length);
    }
    specs(){
        console.log("specs", arguments);
        return this.specs;
    }
}
