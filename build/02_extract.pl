#!/usr/bin/perl

use Encode qw(encode decode from_to);
use Data::Dumper;
use Text::Wrap;

$Text::Wrap::columns = 100;
$Text::Wrap::unexpand = 0;

{
    open FIN,  "<:encoding(iso-8859-1)", ".ALL.html" or die;
    local $/; $data= <FIN>;
    # from_to($data, "iso-8859-1", "ascii");
    # $data= decode("iso-8859-1", $data);
    close FIN;
}

for (split(/"spaceRow"/, $data)) {

    my ($postid, $user)= ($1, $2) if /<span class="name"><a name="([^\"]+)"><\/a><b>([^<]+)<\/b><\/span>/;
    my ($postbody)= ($1) if /class="postbody">(.*)<\/span><span class="gensmall"/s;

    $postbody =~ s/[\r|\{|\}]+//g;
    $postbody =~ s/<(?:img)(?:[^>]+)smil(?:[^>]+)\/>//g;
    $postbody =~ s/<(?:span)(?:[^>]+)>\s*/{/g;
    $postbody =~ s/\s*<\/(?:span)>/}/g;
    $postbody =~ s/<(table)(?:[^>]+)>.*?<\/\1>//sg;

    $postbody =~ s/<br\s*\/>/\n/g;
    $postbody =~ s/^\s+//;
    $postbody =~ s/\s+$//;
    $postbody =~ s/\}\{//;

    my @lines= split (/\n+/, $postbody);
    $postbody= '';
    $postbody .= wrap('', '', $_) . "\n" for @lines;

    $postbody= encode("cp1252", $postbody);

#    print Dumper([ $postid, $user, $postbody ]);

    print "\n\n#-----------------------------------------------------------------------\n";
    print "#A$_ $user\n" for @postids;
    print "$postbody\n";
    print "\n\n#=======================================================================\n";
    print "#Q$postid $user\n";
    print "$postbody\n";

    shift @postids while $#postids > 2;
    push @postids, $postid;

}
