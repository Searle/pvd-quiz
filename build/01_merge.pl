#!/usr/bin/perl

for ($i= 0; $i <= 1695; $i += 15) {
    `cat out/posts$i.html >> .ALL.html`;
}
