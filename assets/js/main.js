var unique = require('uniq');

var data = [1, 2, 2, 3, 4, 5, 5, 5, 6];

console.log(unique(data));



 import fetch from 'node-fetch';
 global.fetch = fetch;

	// import 'whatwg-fetch';

	URL = require('url').URL;


	var unsplashAPIKey = "mzADxqRYqLD-mI6NOWgcK8t6Md9g2T_yS_3plCfpuxc";
	// import nodeFetch from 'node-fetch';

	const unsplash = createApi({
	  accessKey: unsplashAPIKey,
	  fetch: nodeFetch,
	});

	const browserApi = createApi({
  apiUrl: 'https://mywebsite.com/unsplash-proxy',
  //...other fetch options
});

	$.getJSON('https://api.unsplash.com/photos/random&client_id=mzADxqRYqLD-mI6NOWgcK8t6Md9g2T_yS_3plCfpuxc').done(function( data ) {

		console.log(data);
	});