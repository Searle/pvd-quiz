
(function($) {

    var qid= "1169";

    var Q= function(qid) {

        var getEntryCount= function() {
            return quiz[qid].length;
        };

        var getEntryHtml= function(qentry_i) {
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
            return '<div class="qentry">'
                +   '<div class="qtype">' + qtype + '</div>'
                +   '<div class="qauthor">' + qauthor + '</div>'
                +   '<div class="qcontent">' + qcontent.join('') + '</div>'
                + '</div>';
        }

        this.getEntryCount= getEntryCount;
        this.getEntryHtml= getEntryHtml;
        return this;
    };

    $(document).ready(function() {
        var q= Q(qid);
        $('#qentry').html(q.getEntryHtml(0));
    });

})(jQuery);
