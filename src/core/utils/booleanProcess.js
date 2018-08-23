export default class State{
    constructor(state){
        this.state = state||0;
    }

    true(setState){
        if(setState) this.state=2;
        return this.state==2;
    }
    false(setState){
        if(setState) this.state=0;
        return this.state==0;
    }
    turningTrue(setState){
        if(setState) this.state=1;
        return this.state==1;
    }
    turningFalse(setState){
        if(setState) this.state=3;
        return this.state==3;
    }
    trueOrTurningTrue(){
        return this.state==1 || this.state==2;
    }
    falseOrTurningFalse(){
        return this.state==0 || this.state==3;
    }
}
