SHELL=/bin/sh

EFLAGS=-pa ebin

TMP_VER=version_num.tmp

.PHONY: ebins

all: ebins test

ebins:
	test -d ebin || mkdir ebin
	erl $(EFLAGS) -make
	cp src/*.app ebin

clean:
	rm -f cov.html erl_crash.dump
	rm -f ns_server_*.tar.gz
	rm -rf ebin

bdist: clean ebins
	git describe | sed s/-/_/g > $(TMP_VER)
	tar --directory=.. -czf ns_server_`cat $(TMP_VER)`.tar.gz ns_server/ebin
	echo created ns_server_`cat $(TMP_VER)`.tar.gz

test: test_unit

test_unit: ebins
	erl $(EFLAGS) -noshell -s ns_server_test test -s init stop -kernel error_logger silent
