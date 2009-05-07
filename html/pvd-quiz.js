
(function($) {

    var qid= "1169";

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

var db = google.gears.factory.create('beta.database');
db.open('database-test');
db.execute('create table if not exists Test' +
           ' (Phrase text, Timestamp int)');
db.execute('insert into Test values (?, ?)', ['Monkey!', new Date().getTime()]);
var rs = db.execute('select * from Test order by Timestamp desc');

while (rs.isValidRow()) {
  console.log(rs.field(0) + '@' + rs.field(1));
  rs.next();
}
rs.close();

    var q= Q(qid);
    var entry_n= 1;

    var nextA= function() {
        entry_n= entry_n >= q.getEntryCount() - 1 ? 0 : entry_n + 1;
        $('#qentrya').html(q.getAnswerHtml(entry_n));
    };

    $(document)
        .bind('keydown', 'space', function(evt) {
console.log("hu");
            nextA();
            return false; // don't bubble
        })
        .ready(function() {
            $('#qentryq').html(q.getEntryHtml(0));
            entry_n= -1;
            nextA();
        })
    ;

})(jQuery);
