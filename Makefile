.PHONY: tsc compile build prettier test dist

TSC = npx tsc
PRETTIER = npx prettier
NODE = node --experimental-modules
MOCHA = npx mocha
GCC = npx google-closure-compiler --compilation_level=ADVANCED_OPTIMIZATIONS --language_out=ES6

build: tsc

tsc:
	$(TSC) --project src/tsconfig.json

prettier:
	$(PRETTIER) --write src/

test:
	$(PRETTIER) --check src/
	$(MOCHA) build/tests/*.js

dist:
	cp -R build/. dist
	cp src/hanabi/static/* dist/hanabi/
	cp src/tic-tac-toe/static/* dist/tic-tac-toe/
	tail -n +3 build/tic-tac-toe/test.js > dist/tic-tac-toe/test.js
	tail -n +2 build/client/session.js > dist/client/session.js

clean:
	rm -rf dist
	rm -rf build


compile:
	npx webpack --config webpack.config.cjs
	$(GCC) --module_resolution=NODE --js=build/server/main.js --js_output_file=dist/server.js
	# $(GCC) --module_resolution=NODE \
	# --process_common_js_modules \
	# 	--js=build/**/*.js \
	# 	--js_output_file=dist/server.js \
	# 	--entry_point ./build/server/main.js \
	# 	--js node_modules/socket.io/package.json \
	# 	--js node_modules/socket.io/lib/*.js \
	# 	--js node_modules/google-closure-compiler/contrib/nodejs/url.js \
	# 	--jscomp_off=checkVars

	# npx google-closure-compiler --js=build/client/*.js --js_output_file=dist/client.js
