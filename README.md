# mysql-db
Easy Way to request on mysql Server with NodeJS (Manage Queue)


    Object : req {localhost: "", user: "", password:"", database:""}

    db.query.get(query, result) -> result is the callback;
    This function work only for request, for insert or update please look at insert

    eg for 1 request :
        var pid = db.query.get('SELECT 1 + 1 as Solution', function(response){
            console.log(response.rows);
            console.log(response.length);
            db.query.deletePid(pid); // Have to set it for cleanup PID list
        });

    /////////////////////////////////////////////////////////////////////////////////////////

    eg for multiple request :

    var result1 = new Object;
    var pid = db.query.get('SELECT 1 + 1 as Solution', function(response){
            console.log(response.rows);
            console.log(response.length);
            result1 = reponse;
        });

    var result2 = new Object;
    var pid2 = db.query.get('SELECT 1 + 1 as Solution', function(response){
            console.log(response.rows);
            console.log(response.length);
            result2 = reponse;
    });

    //  checkQueue will check when, both of this request will be released.
        will clean automaticaly PID queue

    db.query.checkQueue([pid, pid2], function(statement){
        if (statement == true){
            res.json({data : {0:result1, 1: result2}}); // send data to client;
        }
    });

    ////////////////////////////////////////////////////////////////////////////////////////

    INSERT or UPDATE
    db.query.insert(query, result) -> callback result will return 2 value err, result
    db.query.insert('Update test SET name="test" WHERE id=1', function(err, result){
        if (!err){
            do some stuff
        }else{
            do some stuff
        }
    });
