chrome.runtime.onMessage.addListener(function(request, sender, response) {

	if (request.action == 'crGetPrCommitRefs') {
		// Find basically a case number as part of a branch that occurrs after a / (i.e. hotfix/123-test, feature/testing123, etc.)
		const fbLinkText = '(FogBugz Case)';
		const mrx = /[a-zA-Z0-9].*\/[^0-9]*([0-9]{4,6})[^0-9]*/;

		var caseNumber = 0;
		var haveFbLinks = false;

		var casesFbUrl = request.fbUrl ? (request.fbUrl + (request.fbUrl.endsWith('/') ? '' : '/') + 'f/cases/') : null;

		if (casesFbUrl) {
			$(".commit-ref").children().each(function(i,v) {
				var ct = $(v).text();

				if (ct.includes(fbLinkText)) {
					haveFbLinks = true;
					return false;
				}
			});
		}

		$(".commit-ref").children().each(function(i,v) {
			var bn = $(v).text();

			if (bn) {
				var bnMatch = mrx.exec(bn);

				if (bnMatch && bnMatch[1]) {
					// We just want the first, that will be the case we choose
					if (!caseNumber) {
						caseNumber = bnMatch[1];

						if (haveFbLinks) {
							return false;
						}
					}

					if (casesFbUrl && !haveFbLinks) {
						var appendString = `&nbsp;<a href="${casesFbUrl}${bnMatch[1]}" target="_blank">${fbLinkText}</a>`
						$(v).parent().append(appendString);
					}
				}
			}
		});

		response(caseNumber);
	}

});
