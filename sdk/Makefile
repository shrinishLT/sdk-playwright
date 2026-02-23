
mvser:
	# rm /Users/shrinishv/Documents/LT_Internal/smartui-cli/src/dom/dom-serializer.js
	mv /Users/shrinishv/Documents/LT_Internal/smartui-cli-dom-serializer/dist/bundle.js /Users/shrinishv/Documents/LT_Internal/smartui-cli/src/dom
	mv /Users/shrinishv/Documents/LT_Internal/smartui-cli/src/dom/bundle.js /Users/shrinishv/Documents/LT_Internal/smartui-cli/src/dom/dom-serializer.js

upd:
	cd /Users/shrinishv/Documents/LT_Internal/smartui-cli-dom-serializer && npx webpack --config webpack.config.prod.js 
	# rm /Users/shrinishv/Documents/LT_Internal/smartui-cli/src/dom/dom-serializer.js
	mv /Users/shrinishv/Documents/LT_Internal/smartui-cli-dom-serializer/dist/bundle.js /Users/shrinishv/Documents/LT_Internal/smartui-cli/src/dom
	mv /Users/shrinishv/Documents/LT_Internal/smartui-cli/src/dom/bundle.js /Users/shrinishv/Documents/LT_Internal/smartui-cli/src/dom/dom-serializer.js
	# rm  /Users/shrinishv/Documents/LT_Internal/smartui-cli/lambdatest-smartui-cli-4.1.6.tgz 
	cd /Users/shrinishv/Documents/LT_Internal/smartui-cli && pnpm run build && pnpm pack 
	npm i /Users/shrinishv/Documents/LT_Internal/smartui-cli/lambdatest-smartui-cli-4.1.6.tgz 
	npx smartui exec node test.js --config smartui-web.json  

upd-cli:
	rm  /Users/shrinishv/Documents/LT_Internal/smartui-cli/lambdatest-smartui-cli-4.1.6.tgz 
	cd /Users/shrinishv/Documents/LT_Internal/smartui-cli && pnpm run build && pnpm pack 
	npm i /Users/shrinishv/Documents/LT_Internal/smartui-cli/lambdatest-smartui-cli-4.1.6.tgz 
	npx smartui exec node test.js --config smartui-web.json  