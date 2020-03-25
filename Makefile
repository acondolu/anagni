.PHONY: tsc compile build prettier test dist

TSC = npx tsc
PRETTIER = npx prettier
NODE = node --experimental-modules

build: tsc

tsc:
	$(TSC) --project src/server/tsconfig.json
	$(TSC) --project src/client/tsconfig.json

prettier:
	$(PRETTIER) --write src/

test:
	$(PRETTIER) --check src/
	$(NODE) build/server/main.js
	$(NODE) build/client/main.js

dist:
	cp -r build dist
	cp src/client/static/* dist/client/

clean:
	rm -rf dist
	rm -rf build


compile:
	npx google-closure-compiler --module_resolution=NODE --js=build/server/*.js --js_output_file=dist/server.js --entry_point ./build/server/index.js \
		--js node_modules/socket.io/lib/*.js --js node_modules/socket.io/package.json \
		--js node_modules/debug/package.json \
		--externs node_modules/google-closure-compiler/contrib/nodejs/url.js \
		--jscomp_off=checkVars
	npx google-closure-compiler --js=build/client/*.js --js_output_file=dist/client.js
