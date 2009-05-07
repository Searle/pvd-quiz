#!/usr/bin/perl

# usage: ./03_to_js.pl > pvd-quiz-data.js

use Data::Dumper;

{
    open FIN,  "<:encoding(cp1252)", "QUIZ4.txt" or die;
    local $/; $data= <FIN>;
    close FIN;
}

%q= {};

for (split(/\n/, "$data\n")) {

    s/\s+$//;

    if (/^$/) {
        $nl= 1;
        next;
    }

    next if /^#[-=]/;

    $type= undef;
    $ctype= undef;

    $nl= 1 if s/^\s+//;
    ($nl, $ctype)= (1, '-') if s/^[-]\s*//;

    ($nl, $type, $no, $author)= (1, $1, $2, $3) if /^#(.)(\S+)\s+(.*)/;

    if ($nl && $line) {
        $line =~ s/\s\s+/ /g;

        die Dumper(\%q) . "[$curno?]" unless @{ $q{$curno} }->[-1][2];
        push @{ @{ $q{$curno} }->[-1][2] }, [ $ctype, $line ];

        $nl= 0;
        $line= '';
    }

    if ($type) {
        $curno= $no;

        if ($type eq 'Q') {
            $q{$no}= [[ $type, $author, [] ]];
        }
        else {
            die "Antwort auf nicht existierende Frage: $type$no\n: $_" unless $q{$no};

            push @{ $q{$no} }, [ $type, $author, [] ];
        }
        $nl= 0;
        next;
    }

    $line .= ' ' if $line;
    $line .= $_;
}

use JSON::XS;

print "var quiz=" . encode_json(\%q) . ";";