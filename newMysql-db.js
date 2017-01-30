module.exports = class dbnew {
    constructor(db_extension = '') {
        let lg = new core.conf('database').get(`${core.os.hostname()}${db_extension}`);
        if (typeof lg === 'object') {
            this.host = lg.host;
            this.user = lg.user;
            this.password = lg.password;
            this.database = lg.database;
            this.pidList = [];
            this.pid = [];
            this.last_insert = 0;
            this.change_rows = 0;
            this.size = 0;
            this.MAX_AWAIT_TIME = 1000; // wait max 1 seconds per request in queue;
        } else throw `Error unfound configuration file ./config/database.json get ${core.os.hostname()}${conn}`;
    }
    connexion() {
        let connexion = core.mysql.createConnection({
            host: this.host,
            user: this.user,
            password: this.password,
            database: this.database
        });
        return connexion;
    }
    request(query, callback) {
        let that = this;
        if (query) {
            that.query(query, (result, err) => {
                if (err) callback(null, {
                    rows: [],
                    length: 0,
                    error_msg: err
                });
                else callback({
                    rows: result,
                    length: result.length,
                    size: that.size,
                    insertId: that.last_insert,
                    change_rows: that.change_rows
                }, null);
            });
        } else callback(null, {
            rows: [],
            length: 0,
            error_msg: 'No Request found'
        });
    }
    query(request, result) {
        if (typeof request === 'string' && request != '') {
            let con = this.connexion();
            let pid = this.pidGenerator();
            this.pidList.push(pid);
            con.query(request, (err, rows) => {
                if (err) {
                    con.end();
                    result(null, {
                        status: 'error',
                        msg: err
                    });
                    this.pid.push(pid); // Result released, store PID to pid Finish list;
                } else {
                    let rq = request.split(" ");
                    if (rq.indexOf('INSERT') > -1) this.last_insert = rows.insertId;
                    else if (rq.indexOf('LIMIT') > -1) this.checkLimit(con, (maxResult) =>{
                    	this.size = parseInt(maxResult)
                    	con.end();
                    	result(rows, null);
                    	this.pid.push(pid);
                    });
                    else{
                    	con.end();
                    	result(rows, null);
                    	this.pid.push(pid);
                    }
                }
            });
            return pid;
        } else throw `Error empty request : ${request}`;
    }
    checkLimit(con, res) {
        let pid = this.pidGenerator();
        this.pidList.push(pid)
        con.query(`SELECT FOUND_ROWS() as size`, (err, rows) => {
        	this.pid.push(pid);
            res(rows[0]['size'] || 0);
        });
    }
    select() {}
    update() {}
    delete() {}
    set() {}
    where() {}
    await () {
        let that = this;
        return new Promise((resolve, reject) => {
            let id = setInterval(() => {
    			 if (that.pidList.length === that.pid.length){
    			 	clearInterval(id);
    			 	let checker = 0;
    			 	that.pid.forEach((el, inc) => {
    			 		that.pidList.forEach((xl, znc) => {
    			 			if (el === xl)
    			 				checker++;
    			 		});
    			 	});
    			 	if (checker === that.pid.length){
    			 		that.pid = [];
    			 		that.pidList = [];
    			 		resolve()
    			 	}
    			 	else reject('Something bad happends, like an unvalid request');
    			 }
            });
        });
    }
    pidGenerator() {
        let pid = Math.floor((Math.random() * 1000) + 1);
        if (this.pidList.indexOf(pid) > -1) return this.pidGenerator();
        else return pid;
    }
    pidReclass(pid = []) {
        let ar = []
        if (Array.isArray(pid)) {
            pid.forEach((el, inc) => {
                if (el) ar.push(el);
            });
            return ar;
        } else return ar;
    }
}
