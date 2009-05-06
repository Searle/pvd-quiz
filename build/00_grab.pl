#!/usr/bin/perl

for ($i= 30; $i <= 1695; $i += 15) {
    my $sleep= $i ? rand() * 20 : 0;
    print "waiting $sleep, then fetching posts from $i\n";
    sleep $sleep;
    `curl 'http://www.profvandusen.com/phpBB2/viewtopic.php?t=30&start=$i' > out/posts$i.html`;
}
