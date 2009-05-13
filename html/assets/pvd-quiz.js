
jQuery(function($) {

    // ========================================================================
    //   Q Class
    // ========================================================================

    var Q= function(qid) {

        var getEntryCount= function() {
            return quiz[qid].length;
        };

        var listAsHtml= function(qtype, qentries, qactions, hilightLast) {
            var content= [];

            for (var i= 0; i < qentries.length; i++) {
                var class_= (hilightLast && i == qentries.length - 1) ? ' hilight' : '';
                content.push(
                    '<div class="qauthor' + class_ + '">',  qentries[i][1], '</div>',
                    '<div class="qcontent' + class_ + '">', qentries[i][2], '</div>'
                );
            }
            return '<div class="qentry">'
                +   '<div class="qtype"><div class="qtype-i">' + qtype + '</div></div>'
                +   content.join('')
                +   '<div class="qactions">' + (qactions ? qactions : '') + '</div>'
                + '</div>';
        };

        var asHtml= function(qtype, qauthor, qcontent, qactions) {
            return listAsHtml(qtype, [[ '', qauthor, qcontent ]], qactions, false);
        };

        var getEntry= function(qentry_i) {
            var qentry=  quiz[qid][qentry_i];
            var qtype=   qentry[0];
            var qauthor= qentry[1];
            var qparts=  qentry[2];
            var qcontent= [];
            for (var qpart_i in qparts) {
                var qpart=     qparts[qpart_i];
                var qptype=    qpart[0];
                var qpcontent= qpart[1];
                qpcontent= qpcontent.replace(/\b(http:\/\/\S+)/, '<a class="button" target="_blank" href="$1">$1</a>');
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

        var getAnswerHtml= function(game, qentry_i) {
            var entries= getEntries();
            var isLastEntry= qentry_i >= entries.length - 1;

            var navHtml= [];
            for (var i= 0; i < entries.length; i++) {
                var qentry= entries[i];
                var class_= i == qentry_i ? 'active' : 'other';
                navHtml.push('<span class="qtype-nav ', class_, '">', qentry[0], '</span>');
            }
            navHtml= navHtml.join('');

            var actionHtml= [
                (isLastEntry ? '<div class="title">Wer hat\'s gewu&szlig;t?</div>' : '<div class="title">&nbsp;</div>' ),
                '<div class="actions">',
                '<div class="skip"><a class="button big" href="#q_solved:qid=', qid, ':uid=0">Frage&nbsp;&uuml;berspringen</a></div>'
            ];
            if (isLastEntry && game) {
                var players= game.getPlayers();
                for (var i in players) {
                    var user= players[i];
                    actionHtml.push(' <a class="button big" href="#q_solved:qid=', qid, ':uid=', user.user_id, '">', user.name, '</a>');
                }
            }
            else {
                actionHtml.push('<a class="button big" href="#q_skip">N&auml;chste Antwort / n&auml;chster Tipp</a>');
            }
            actionHtml.push('</div>');
            actionHtml= actionHtml.join('');

            if (qentry_i == 0) {
                return asHtml(navHtml, '&nbsp;', '<p>Viel Spa&szlig; beim Raten!</p><p>Mit "Leerzeichen"-Taste geht\'s zum n&auml;chsten Tipp bzw. zur n&auml;chsten Antwort!</p>', actionHtml);
            }
            var qentries= [];
            for (var i= 0; i < qentry_i; i++) qentries.push(entries[i + 1]);
            return listAsHtml(navHtml, qentries, actionHtml, isLastEntry);
        };

        // Public methods
        this.getEntryCount= getEntryCount;
        this.getEntryHtml= getEntryHtml;
        this.getAnswerHtml= getAnswerHtml;
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
        db.execute('CREATE TABLE IF NOT EXISTS q ('
            + '  qid TEXT PRIMARY KEY'
            + ')');
        db.execute('CREATE TABLE IF NOT EXISTS solved ('
            + '  user_id INTEGER, qid TEXT'
            + ')');

        // Make DB repair by creating new view
        // Have to use a catch clause until I'm online...
        try {
            db.execute('DROP VIEW user');
        }
        catch(e) {}

        // The DISTINCT thingy 'solved_d' is somewhat stupid, but it fixes a bug in a previous version, where multiple
        // identical entries in the solved table could occur.
        db.execute('CREATE VIEW user AS'
            + '  SELECT *, (SELECT COUNT(*) FROM ('
            + '      SELECT DISTINCT qid, user_id FROM solved'
            + '    ) AS solved_d WHERE solved_d.user_id = user_data.user_id'
            + '  ) AS solved_count FROM user_data'
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

        if (!fetchOne("SELECT COUNT(*) AS c FROM q").c) {
            console.log("Building Q cache");
            for (var qid in quiz) {
                execute("INSERT INTO q (qid) VALUES(?)", qid);
            }
        }

        // Clean up "solved" table in case questions changed
        db.execute('DELETE FROM solved WHERE qid NOT IN ('
            + '  SELECT qid FROM q'
            + ')');

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
            db.execute('DELETE FROM solved WHERE user_id = ?', userId);
        };

        var getAll= function() {
            return db.fetch('SELECT * FROM user ORDER BY name');
        };

        var setGame= function(game_) {
            game= game_;
            updateList();
        };

        var getUnsolvedQids= function(userIds) {
            var in_= userIds.join(',').replace(/\d+/g, '?');
            var result= db.fetch('SELECT * FROM q WHERE (qid NOT IN (SELECT qid FROM solved WHERE user_id IN (' + in_ + ')))', userIds);
            var qids= [];
            for (var i in result) qids.push(result[i].qid);
            return qids;
        };

        var setSolved= function(user_id, qid) {
            if (db.fetchOne('SELECT EXISTS(SELECT * FROM solved WHERE user_id = ? AND qid = ?) AS e', user_id, qid).e) {
                console.warn("Catched bug, already marked as 'solved' for user");
                return;
            }
            db.execute('INSERT INTO solved (user_id, qid) VALUES (?, ?)', user_id, qid);
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
                    a_class=  ' disabled';
                    tr_class= 'hilight';
                }
                html.push('<tr class="' + tr_class + '">',
                    '<td class="checkbox-inside"><input type="checkbox" id="' + cb_id + '"' + cb_attr + ' /></td>',
                    '<td>', user.name, '</td>',
                    '<td>', user.solved_count, '</td>',
                    '<td>', Math.floor(1000 * user.solved_count / qs.getCount()) / 10, '%</td>',
                    '<td><a class="button' + a_class + '" href="#user_remove:id=', user.user_id, ':kcount=', user.solved_count, '">L&ouml;schen</a></td>',
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
        this.getUnsolvedQids= getUnsolvedQids;
        this.setSolved= setSolved;
        return this;
    };

    // ========================================================================
    //   Game class
    // ========================================================================

    var Game= function(users, playerIds) {
        var qid;
        var q;
        var qids= users.getUnsolvedQids(playerIds);
        var answer_i;
        var players;

        players= [];
        for (var i in playerIds) {
            var player= users.getById(playerIds[i]);
            player.game_solved_count= 0;
            players[playerIds[i]]= player;
        }

        var setSolved= function(user_id, qid) {
            players[user_id].game_solved_count++;
            users.setSolved(user_id, qid);
        };

        var getPlayers= function() {
            return players;
        };

        var nextA= function() {
            if (q == null) return 0;
            if (answer_i < q.getEntryCount()) answer_i++;
            return answer_i;
        };

        var getA= function() {
            return answer_i;
        };

        var nextQ= function() {
            if (qids.length == 0) {
                qid= -1;
                q= null;
            }
            else {
                var n= Math.floor(Math.random() * qids.length);
                qid= qids.splice(n, 1);
                if ($.isArray(qid)) qid[0];  // I remotely remember a JS bug with splice returning a scalar instead of an array...
                q= new Q(qid);
            }
            answer_i= -1;
            nextA();
            return q;
        };

        var getQ= function() {
            return q;
        };

        var getQCount= function() {
            return qids.length + 1;
        };

        nextQ();

        this.getPlayers= getPlayers;
        this.getQ= getQ;
        this.getA= getA;
        this.nextQ= nextQ;
        this.nextA= nextA;
        this.getQCount= getQCount;
        this.setSolved= setSolved;
        return this;
    };

    // ========================================================================
    //   DOM Event handlers
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

        return cmdFn(params);
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

    var showPage= function(name) {
        $('body').removeClass('show-overview').removeClass('show-quiz')
            .addClass('show-' + name);
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
        if (parseInt(params.kcount) && !confirm("Wirklich loeschen?")) return;

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
        users.updateList();
        showPage('overview');
    };

    cmds.page_quiz= function(params) {
        if (game) showPage('quiz');
    };

    cmds.q_solved= function(params) {
        if (parseInt(params.uid)) {
            game.setSolved(params.uid, params.qid);
        }
        game.nextQ();
        updateQuizUi();
    };

    cmds.q_skip= function(params) {
        game.nextA();
        updateQuizUi();
    };

    // ========================================================================
    //   MAIN
    // ========================================================================

    var db= new Db();
    var qs= new Qs();
    var users= new Users(db, qs);
    var game;

    var updateQuizUi= function() {
        $('#qentryq').html(game.getQ().getEntryHtml(0));
        $('#qentrya').html(game.getQ().getAnswerHtml(game, game.getA()));
        var players= game.getPlayers();
        var html= [ "Q's: ", game.getQCount() ];
        for (var i in players) {
            var player= players[i];
            html.push(", ", player.name, ":&nbsp;", player.game_solved_count);
        }
        $('#score').html(html.join(''));
    };

    var startGame= function(playerIds) {
        game= new Game(users, playerIds);
        if (game.getQ() == null) {
            error("Es gibt keine Fragen mehr, die die ausgew&auml;hlten Mitspieler nicht schon beantwortet h&auml;tten!");
            return false;
        }

        $('body').addClass('game-running');
        $('#tab-quiz').removeClass('disabled');
        users.setGame(game);
        updateQuizUi();
        showPage('quiz');
        return true;
    };

    var stopGame= function() {
        $('body').removeClass('game-running');
        $('#tab-quiz').addClass('disabled');
        game= null;
        users.setGame(game);
    };

    $('.quiz-count').html(qs.getCount());

    $(document).bind('keydown', 'space', cmds.q_skip);
});
