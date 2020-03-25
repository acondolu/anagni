.PHONY = tsc compile build prettier test

build: tsc compile

tsc:
	npx tsc --project src/server/tsconfig.json
	npx tsc --project src/client/tsconfig.json

compile:
	npx google-closure-compiler --module_resolution=NODE --js=build/server/*.js --js_output_file=dist/server.js --entry_point ./build/server/index.js \
		--js node_modules/socket.io/lib/*.js --js node_modules/socket.io/package.json \
		--js node_modules/debug/package.json \
		--externs node_modules/google-closure-compiler/contrib/nodejs/url.js \
		--jscomp_off=checkVars
	npx google-closure-compiler --js=build/client/*.js --js_output_file=dist/client.js

prettier:
	npx prettier --write src/

test: tsc
	npx prettier --check src/
	node build/server/index.js
	node build/client/main.js

clean:
	rm -f dist/*.js
	rm -rf build
