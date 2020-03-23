.PHONY = compile transpile

transpile:
	npx tsc

compile:
	npx google-closure-compiler --js=build/*.js --js_output_file=dist/out.js