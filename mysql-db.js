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

    If you didn't download the config.js file, please replace all lg fields by your own informations :)
*/

var mysql = require('mysql');

/*
    MYSQLI Library - N-SHOKA TEAM
    @author Brice Daupiard - 06/16
 */
var mysql = require('mysql');
var config = require('./config.js');
var os = require("os");
var tatools = require('./taTools.js');
const json = require('locutus/php/json');
const stripSlashes = require('locutus/php/strings/stripslashes');
var db = function(conn, req, pool) {
    var lg = new config('database').get();
    this.host = lg.host;
    this.user = lg.user;
    this.password = lg.password;
    this.database = lg.database;
    var that = this;
    this.blob2Readdable = function(data) {
            // Get Blob file from database, parse it and send it to JSON format.
            var buffer = new Buffer(data, 'binary').toString();
            buffer = stripSlashes(buffer);
            return JSON.parse(buffer);
        },
        this.escape = {
            // Same function as real_escape_string
            'string': function(str) {
                if (str != '' && str != undefined && str != null && typeof str == 'string') {
                    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
                        switch (char) {
                            case "\0":
                                return "\\0";
                            case "\x08":
                                return "\\b";
                            case "\x09":
                                return "\\t";
                            case "\x1a":
                                return "\\z";
                            case "\n":
                                return "\\n";
                            case "\r":
                                return "\\r";
                            case "\"":
                            case "'":
                            case "\\":
                            case "%":
                                return "\\" + char;
                        }
                    });
                } else {
                    return str;
                }
            }
        }
    var that = this;
    this.status = {};
    this.release = null;
    this.insertId = null;
    this.query = {
        // Function that will allow you to Select Update Insert etc...
        // return callback Object ({rows : rowsPacket, length: num of result, size : total_size without limit})
        'get': function(query, result) {
            console.log(query)
            var pid = that.query.newPid();
            var size = 0;
            var connection = mysql.createConnection({
                host: that.host,
                user: that.user,
                password: that.password,
                database: that.database
            });
            connection.connect();
            connection.query(query, function(err, rows) {
                if (err) {
                    connection.end();
                    throw err;
                }
                var b = query.toUpperCase().split(' ');
                // console.log(b);
                if (b.indexOf('INSERT') > -1) {
                    connection.query('SELECT LAST_INSERT_ID() as id', function(err, rows) {
                        this.insertId = rows[0]['id'];
                    });
                }
                if (b.indexOf('LIMIT') > -1) {
                    var dataRows = rows;
                    connection.query('SELECT FOUND_ROWS() as size', function(err, rows) {
                        size = rows[0]['size'];
                        // Save the PID to the list Queue
                        that.query.processPid.push(pid);
                        connection.end();
                        result({
                            rows: dataRows !== '' && dataRows !== undefined ? dataRows : [],
                            length: dataRows !== '' && dataRows !== undefined ? dataRows.length : 0,
                            size: size
                        });
                    });
                } else {
                    // Save the PID to the list Queue
                    that.query.processPid.push(pid);
                    connection.end();
                    result({
                        rows: rows !== '' && rows !== undefined ? rows : [],
                        length: rows !== '' && rows !== undefined ? rows.length : 0,
                    });
                }
            });
            // return the selected PID to main function
            return pid;
        },
        'queryQueue': function(query, result) {
            var pid = that.query.newPid();
            var size = 0;
            this.queue.push(query);
        },
        // Function that will create a New Pid, and return it to requester
        'newPid': function() {
            var tmpPid = Math.floor((Math.random() * 1000) + 1);
            if (that.query.processPid.indexOf(tmpPid) > -1) {
                while (that.query.processPid.indexOf(tmpPid) > -1) {
                    tmpPid = Math.floor((Math.random() * 1000) + 1);
                }
                return tmpPid;
            } else {
                return tmpPid;
            }
        },
        // List of current request inworking
        'processPid': [],
        // Function that will clean ended PID
        'deletePid': function(pid) {
            var stuff = new tatools();
            delete that.query.processPid[that.query.processPid.indexOf(pid)];
            that.query.processPid = stuff.arrayRemap(that.query.processPid);
            return true;
        },
        // Will check all ended request with the previous PID given on the GET function. (Should be an array)
        'checkQueue': function(pidList, callback) {
            // Queue Request Manager, let you know when request are ended before release result.
            // A Queue System for Async code. Still pending untils your request is done.
            var c = 1;
            var limit = 100;
            var z = 0;
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
                } else if (z >= limit) {
                    // If we stayed locked in an infinite loop force to break it.
                    clearInterval(id);
                    callback(true);
                } else {
                    clearInterval(id);
                    callback(false);
                }
                z++;
            }, 10);
        },
        'getFields': function(model, key, alias) {
            // get Select fields from JSON file, and return it
            alias = alias == undefined ? '' : `${alias}.`;
            if (alias == undefined) alias = '';
            if (model == undefined && typeof model != 'string') throw 'Missing model/conf file name';
            if (key == undefined && key != '') // We can pass an empty key.
                key = model;
            // Allow you to get field from us
            var md = new config(model).get(key);
            var buff = [];
            for (var x in md) {
                buff.push(`${alias}${x} `);
            }
            return buff.join(',');
        },
        'insert': (name, object) => {
            let rq = [];
            let fields = [];
            let values = [];
            if (Array.isArray(object)) {
                object.forEach((el) => {
                    for (var x in el) {
                        fields.push(x);
                        values.push(el[x]);
                    }
                    rq.push(`INSERT INTO ${name.toString()} (${fields.join(",")}) VALUES ("${values.join('","')}")`);
                    fields = [];
                    values = [];
                })
                rq = rq.join(';');
            } else {
                for (var x in object) {
                    fields.push(x);
                    values.push(object[x]);
                } rq = `INSERT INTO ${name.toString()} (${fields.join(",")}) VALUES ("${values.join('","')}")`;
            }
            return that.query.get(rq, (result) => {
                that.status = 200;
                that.insertId = result.rows.insertId;
            });
        },
        'insertId': () => {
            return that.insertId
        },
        'update': (table) => {
            var pthat = this;
            this.setter = null;
            this.wheres = null;
            this.set = (field, value) => {
                if (typeof field === 'object') {
                    for (var x in field) {
                        if (pthat.setter === null) {
                            pthat.setter = [];
                            pthat.setter.push(`SET ${x}="${field[x]}"`);
                        } else pthat.setter.push(`${x}="${field[x]}"`);
                    }
                } else if (typeof field === 'string' && typeof value === 'string') {
                    pthat.setter = `SET ${field.toString()}="${value.toString()}"`;
                } else {
                    throw 'Error bad usage of update.set()';
                }
                pthat.setter = Array.isArray(pthat.setter) ? pthat.setter.join(",") : pthat.setter;
            }
            this.where = (field, operator) => {
                var pthat = this;
                var z = 0;
                var rq = null;
                if (typeof field === 'object') {
                    for (var x in field) {
                        if (Array.isArray(operator)) {
                            if (pthat.wheres === null) {
                                pthat.wheres = [];
                                pthat.wheres.push(`WHERE ${x} (${operator[z++] || "="})"${field[x]}"`);
                            } else pthat.wheres.push(`${x} (${operator[z++] || "="})"${field[x]}"`);
                        } else {
                            if (pthat.wheres === null) {
                                pthat.wheres = [];
                                pthat.wheres.push(`WHERE ${x} (${operator || "="})"${field[x]}"`);
                            } else pthat.wheres.push(`${x} (${operator || "="})${field[x]}"`);
                        }
                    }
                    pthat.wheres = Array.isArray(pthat.wheres) ? pthat.wheres.join(" AND ") : pthat.wheres;
                }   else if (typeof field === 'string' && operator === 'string') pthat.wheres = `WHERE ${fields}="${operator}"`;
                    else throw 'Error bad usage of update.where()';
            }
            this.push = () => {
                return that.query.get(`UPDATE ${table.toString()} ${pthat.setter} ${pthat.wheres}`, (result) => {
                    pthat.setter = null;
                    pthat.wheres = null;
                });
            }
            return this;
        }
    }
}
module.exports = db;
