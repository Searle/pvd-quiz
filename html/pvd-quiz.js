
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

    var Qs= function() {
        var count= 0;

        var getQ= function(q_i) {
            return new Q(q_i);
        };

        var getCount= function() {
            if (count) return count;
            for (var dummy in quiz) {
                count++;
            }
            return count;
        };

        // Public methods
        this.getQ= getQ;
        this.getCount= getCount;
        return this;
    }


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

    var Users= function(db, qs) {
        var game;

        var getByName= function(name) {
            return db.fetchOne('SELECT * FROM user WHERE name = ?', name);
        };

        var getById= function(id) {
            return db.fetchOne('SELECT * FROM user WHERE user_id = ?', id);
        };

        var add= function(name) {
            db.execute('INSERT INTO user_data (name) VALUES (?)', name);
        };

        var remove= function(userId) {
            db.execute('DELETE FROM user_data WHERE user_id = ?', userId);
            db.execute('DELETE FROM known WHERE user_id = ?', userId);
        };

        var getAll= function() {
            return db.fetch('SELECT * FROM user ORDER BY name');
        };

        var setGame= function(game_) {
            game= game_;
            updateList();
        };

        var updateList= function() {
            var users= getAll();
            var html= [];            
            var players= game ? game.getPlayers() : {};
            html.push('<tr>',
                '<th>Spielt mit?</th>',
                '<th>Name</th>',
                '<th>Gel&ouml;st</td>',
                '<th>%</td>',
                '<th></td>',
                '</tr>');
            for (var user_i in users) {
                var user= users[user_i];
                var cb_id= 'user' + user.user_id + '_plays';
                var cb_attr= '';
                var a_class= '';
                var tr_class= '';
                if (game) {
                    if (!players[user.user_id]) continue;
                    cb_attr=  ' disabled="true" checked="true"';
                    a_class=  'disabled';
                    tr_class= 'hilight';
                }
                html.push('<tr class="' + tr_class + '">',
                    '<td class="checkbox-inside"><input type="checkbox" id="' + cb_id + '"' + cb_attr + ' /></td>',
                    '<td>', user.name, '</td>',
                    '<td>', user.known_count, '</td>',
                    '<td>', Math.floor(1000 * user.known_count / qs.getCount()) / 10, '%</td>',
                    '<td><a class="' + a_class + '" href="#user_remove:id=', user.user_id, ':kcount=', user.known_count, '">L&ouml;schen</a></td>',
                    '</tr>');
            }
            $('#users').html('<table class="std">' + html.join('') + '</table>');
        };

        updateList();

        // Public methods
        this.getByName= getByName;
        this.getById= getById;
        this.getAll= getAll;
        this.add= add;
        this.remove= remove;
        this.updateList= updateList;
        this.setGame= setGame;
        return this;
    };

    // ========================================================================
    //   Game class
    // ========================================================================

    var Game= function(playerIds) {

        var getPlayerIds= function() {
            return playerIds;
        };

        var getPlayers= function() {
            var result= {};
            for (var i in playerIds) {
                result[playerIds[i]]= users.getById(playerIds[i]);
            }
            return result;
        };

        // this.getPlayerIds= getPlayerIds;
        this.getPlayers= getPlayers;
        return this;
    };

    // ========================================================================
    //   DOM Events handler
    // ========================================================================

    var cmds= {};

    // Taken from Rabak
    // Dispatches clicks to functions defined in cmds[]
    $('a').live('click', function() {
        console.log("Clicked:", $(this).attr('href'));

        if ($(this).hasClass('disabled')) return;
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

    $('.checkbox-inside').live('click', function(ev) {
        if (ev.target.tagName == 'INPUT') return true;
        $('input[type=checkbox]', this).click();
        return false;
    });

    $('.link-inside').live('click', function(ev) {
        if (ev.target.tagName == 'A') return true;
        $('a', this).click();
        return false;
    });

    // ========================================================================
    //   Global functions
    // ========================================================================

    var error= function(message) {

        // TODO: yuck, alerts! make pretty
        alert(message
            .replace(/&szlig;/, 'ss')
            .replace(/&([aouAOU])uml;/g, function(match, sub1) { return sub1 + 'e'; })
            + "!");
    };

    // ========================================================================
    //   Click Events
    // ========================================================================

    cmds.user_add= function(params) {
        var name= $('#' + params.input).val().replace(/^\s+/, '').replace(/\s+$/, '').replace(/[^a-zA-Z0-9 ]+/g, '');
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
        users.updateList(game);
    };

    cmds.user_remove= function(params) {
        if (parseInt(params.kcount) && !confirm("Wirklich l&ouml;schen?")) return;

        users.remove(params.id);
        users.updateList();
    };

    cmds.quiz_start= function(params) {
        var userlist= users.getAll();
        if (userlist.length == 0) {
            error("Bitte erst Spieler anlegen");
            return;
        }
        var playerIds= [];
        for (var i in userlist) {
            var user= userlist[i];
            if ($('#user' + user.user_id + '_plays').attr('checked')) playerIds.push(user.user_id);
        }
        if (playerIds.length == 0) {
            error("Bitte erst Mitspieler ausw&auml;hlen");
            return;
        }
        startGame(playerIds);
    };

    cmds.quiz_stop= function(params) {
        stopGame();
    };

    cmds.page_overview= function(params) {
        $('body').removeClass('show-quiz').addClass('show-overview');
    };

    cmds.page_quiz= function(params) {
        $('body').removeClass('show-overview').addClass('show-quiz');
    };

    // ========================================================================
    //   MAIN
    // ========================================================================

    var startGame= function(playerIds) {
        $('body').addClass('game-running');
        game= new Game(playerIds);
        users.setGame(game);
    };

    var stopGame= function() {
        $('body').removeClass('game-running');
        game= null;
        users.setGame(game);
    };

    var db= new Db();
    var qs= new Qs();
    var users= new Users(db, qs);
    var game;

    var qid= "1169";
    var q= qs.getQ(qid);
    var entry_n= 1;

    $('.quiz-count').html(qs.getCount());

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
