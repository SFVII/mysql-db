/*
    The MIT License (MIT)
    Copyright (c) 2016 Daupiard Brice - brice@nippon.wtf
    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var mysql = require('mysql');

var db = function(req) {
    this.host = req.localhost;
    this.user = req.user;
    this.password = req.password;
    this.database = req.database;
    this.connection = mysql.createConnection({
        host: this.host,
        user: this.user,
        password: this.password,
        database: this.database
    });
    var that = this;
    this.pool = mysql.createPool({
        host: this.host,
        user: this.user,
        password: this.password,
        database: this.database
    })
    this.connection.connect();
    var that = this;
    this.query = {
        'get': function(query, result) {
            var pid = that.query.newPid();
            that.pool.getConnection(function(err, conn) {
                conn.query(query, function(err, rows) {
                    that.query.processPid.push(pid);
                    result({
                        rows: rows !== '' && rows !== undefined ? rows : [],
                        length: rows !== '' && rows !== undefined ? rows.length : 0
                    });
                });
                conn.release();
            });
            return pid;
        },
        'insert': function(query, callback) {
            that.connection.query(query, null, function(err, result) {
                callback(err, result);
            });
        },
        'newPid': function(){
            var tmpPid = Math.floor((Math.random() * 1000) + 1);
            if (that.query.processPid.indexOf(tmpPid) > -1){
                while (that.query.processPid.indexOf(tmpPid) > -1){
                    tmpPid = Math.floor((Math.random() * 1000) + 1);
                }
                return tmpPid;
            }else{
                return tmpPid;
            }
        },
        'processPid': [],
        'deletePid' : function(pid){
            delete that.query.processPid[that.query.processPid.indexOf(pid)];
            return true;
        },
        'checkQueue': function(pidList, callback) {
            var c = 1;
            var id = setInterval(function() {
                if (pidList.length) {
                    pidList.forEach(function(elem, index) {
                        if (that.query.processPid.indexOf(elem) > -1) {
                            that.query.deletePid(elem);
                            if (c == pidList.length) {
                                clearInterval(id);
                                callback(true);
                            }c++;
                        }
                    });
                }else{
                    clearInterval(id);
                    callback(false);
                }
            }, 5);
        }
    }

}
module.exports = db;