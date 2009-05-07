
jQuery(function($) {

    // ========================================================================
    //   Q Class
    // ========================================================================

    var Q= function(qid) {

        var getEntryCount= function() {
            return quiz[qid].length;
        };

        var asHtml= function(qtype, qauthor, qcontent) {
            return '<div class="qentry">'
                +   '<div class="qtype"><div class="qtype-i">' + qtype + '</div></div>'
                +   '<div class="qauthor">' + qauthor + '</div>'
                +   '<div class="qcontent">' + qcontent + '</div>'
                + '</div>';
        };

        var getEntry= function(qentry_i) {
            var qentry=  quiz[qid][qentry_i];
            var qtype=   qentry[0];
            var qauthor= qentry[1];
            var qparts=  qentry[2];
            var qcontent= [];
            for (qpart_i in qparts) {
                var qpart=     qparts[qpart_i];
                var qptype=    qpart[0];
                var qpcontent= qpart[1];
                var class_= '';
                if (qptype == '-') class_= ' class="li"';
                qcontent.push('<p', class_, '>', qpcontent, '</p>'); 
            }
            return [ qtype, qauthor, qcontent.join('') ];
        };

        var getEntries= function() {
            var result= [];
            for (var i= quiz[qid].length - 1; i >= 0; i--) {
                result.unshift(getEntry(i));
            }
            return result;
        };

        var getEntryHtml= function(qentry_i) {
            var qentry= getEntry(qentry_i);
            return asHtml(qentry[0], qentry[1], qentry[2]);
        };

        var getAnswerHtml= function(qentry_i) {
            var entries= getEntries();
            var navHtml= [];
            for (var i= 0; i < entries.length; i++) {
                var qentry= entries[i];
                var class_= i == qentry_i ? 'active' : 'other';
                navHtml.push('<span class="qtype-nav ', class_, '">', qentry[0], '</span>');
            }
            var qentry= entries[qentry_i];
            if (qentry_i == 0) qentry[1]= qentry[2]= '&nbsp;';
            return asHtml(navHtml.join(''), qentry[1], qentry[2]);
        };

        // Public methods
        this.getEntryCount= getEntryCount;
        this.getEntryHtml= getEntryHtml;
        this.getAnswerHtml= getAnswerHtml;
        // this.asHtml= asHtml;
        // this.getEntries= getEntries;
        return this;
    };

    // ========================================================================
    //   Db Class
    // ========================================================================

    var Db= function() {
        var db = google.gears.factory.create('beta.database');
        db.open('pvd');
        db.execute('CREATE TABLE IF NOT EXISTS user_data ('
            + '  user_id INTEGER PRIMARY KEY, name TEXT'
            + ')');
        db.execute('CREATE TABLE IF NOT EXISTS known ('
            + '  user_id INTEGER, qid TEXT'
            + ')');
        db.execute('CREATE VIEW IF NOT EXISTS user AS'
            + '  SELECT *, (SELECT COUNT(*) FROM known WHERE known.user_id = user_data.user_id) AS known_count FROM user_data'
            + '');

        var arguments2array= function(args, skip) {
            skip= skip ? skip : 0;
            if (args.length > skip && $.isArray(args[skip])) return args[skip];
            var result= [];
            for (var i= skip; i < args.length; i++) {
                result.push(args[i]);
            }
            return result;
        };

        var execute= function() {
            return db.execute.apply(db, [ arguments[0], arguments2array(arguments, 1) ]);
        };

        var fetch= function() {
            var rs = execute.apply(this, arguments);
            var result= [];
            while (rs.isValidRow()) {
                var row= {};
                for (var i= rs.fieldCount() - 1; i >= 0; i--) {
                    row[rs.fieldName(i)]= rs.field(i);
                }
                result.push(row);
                rs.next();
            }
            rs.close();
            return result;
        };

        var fetchOne= function() {
            var result= fetch.apply(this, arguments);
            return result.length ? result[0] : null;
        };

        // Public methods
        this.fetch= fetch;
        this.fetchOne= fetchOne;
        this.execute= execute;
        return this;
    };

    // ========================================================================
    //   Users class
    // ========================================================================

    var Users= function(db) {

        var getByName= function(name) {
            return db.fetchOne('SELECT * FROM user WHERE name = ?', name);
        };

        var add= function(name) {
            db.execute('INSERT INTO user_data (name) VALUES (?)', name);
        };

        var remove= function(userId) {
            db.execute('DELETE FROM user_data WHERE user_id = ?', userId);
            db.execute('DELETE FROM known WHERE user_id = ?', userId);
        };

        var updateList= function() {
            var users= db.fetch('SELECT * FROM user ORDER BY name');
            var html= [];            
            for (var user_i in users) {
                var user= users[user_i];
                html.push('<tr>',
                    '<td>', user.name, '</td>',
                    '<td>', user.known_count, '</td>',
                    '<td><a href="#user_remove:id=', user.user_id, ':kcount=', user.known_count, '">L&ouml;schen</a></td>',
                    '</tr>');
            }
            $('#users').html('<table>' + html.join('') + '</table>');
        };

        updateList();

        // Public methods
        this.getByName= getByName;
        this.add= add;
        this.remove= remove;
        this.updateList= updateList;
        return this;
    };

    // ========================================================================
    //   Event handler
    // ========================================================================

    var cmds= {};

    // Taken from Rabak
    // Dispatches clicks to functions defined in cmds[]
    $('a').live('click', function() {
        console.log("Clicked:", $(this).attr('href'));

        var href= $(this).attr('href');

        // Not an internal link, pass on to browser
        if (href.substr(0, 1) != '#') return true;

        var paramsl= href.substr(1).split(/[:=]/);
        var cmd= paramsl.shift();
        var cmdFn= cmds[cmd];
        if (!cmdFn) {
            console.error('Command "' + cmd + '" not defined');
            return false;
        }

        var params= {};
        while (paramsl.length) {
            var key= paramsl.shift();
            params[key]= paramsl.shift();
        }

        cmdFn(params);
        return false;
    });

    // ========================================================================
    //   Click Events
    // ========================================================================

    var error= function(message) {

        // TODO: yuck, alerts! make pretty
        alert(message + "!");
    };

    cmds.user_add= function(params) {
        var name= $('#' + params.input).val().replace(/^s+/, '').replace(/\s+$/, '').replace(/[^a-zA-Z0-9 ]+/g, '');
        if (!name) {
            error("Name darf weder leer sein noch aus seltsamen Zeichen bestehen");
            return;
        }
        if (users.getByName(name)) {
            error("Name existiert bereits");
            return;
        }
        $('#new-user-name').val('');
        users.add(name);
        users.updateList();
    };

    cmds.user_remove= function(params) {
        if (parseInt(params.kcount) && !confirm("Wirklich loeschen?")) return;

        users.remove(params.id);
        users.updateList();
    };

    // ========================================================================
    //   MAIN
    // ========================================================================

    var qid= "1169";

    var db= new Db();

    var users= new Users(db);

    var q= new Q(qid);
    var entry_n= 1;

    var nextA= function() {
        entry_n= entry_n >= q.getEntryCount() - 1 ? 0 : entry_n + 1;
        $('#qentrya').html(q.getAnswerHtml(entry_n));
    };

    $(document)
        .bind('keydown', 'space', function(evt) {
            nextA();
            return false; // don't bubble
        })
    ;

    $('#qentryq').html(q.getEntryHtml(0));
    entry_n= -1;
    nextA();


});
