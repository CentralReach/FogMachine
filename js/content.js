chrome.runtime.onMessage.addListener(function(request, sender, response) {

	if (request.action == 'crGetPrCommitRefs') {
		// Find basically a case number as part of a branch that occurrs after a / (i.e. hotfix/123-test, feature/testing123, etc.)
		var mrx = /[a-zA-Z0-9].*\/[^0-9]*([0-9]+)[^0-9]*/;
		var caseNumber = 0;

		$(".commit-ref").children().each(function(i,v) {
			var bn = $(v).text();

			if (bn) {
				var bnMatch = mrx.exec(bn);

				if (bnMatch && bnMatch[1]) {
					// We just want the first, that will be the case we choose
					caseNumber = bnMatch[1];
					return false;
				}
			}
		});

		response(caseNumber);
	}

});
