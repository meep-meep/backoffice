function makeAutoCompleter(tagList) {
    return function (event) {
        var inputElement = event.currentTarget;
        if(typeof inputElement.selectionStart === 'number') {
            inputElement.value = inputElement.value.substr(0, inputElement.selectionStart);
        }
        var currentText = inputElement.value + String.fromCharCode(event.keyCode);
        var inputTagList = [];

        if(!/^ *$/.test(currentText)) {
            inputTagList = currentText.split(',').map(function(tag) {return tag.trim();});
        }

        if(inputTagList.length) {
            if(!/[a-zA-Z\-\_]/.test(String.fromCharCode(event.keyCode))) {
                return;
            }
            var lastELement = inputTagList[inputTagList.length -1];
            var matchingTags = tagList.filter(function(tag) {return tag.toLowerCase().indexOf(lastELement.toLowerCase()) === 0;});

            setTimeout(function() {
                inputElement.value = '';
                var newTagList = [];
                newTagList = newTagList.concat(inputTagList.slice(0, -1));

                if(matchingTags.length) {
                    newTagList.push(matchingTags[0]);
                }
                else {
                    newTagList.push(inputTagList[inputTagList.length - 1]);
                }
                inputElement.value += newTagList.join(',');
                createSelection(inputElement, currentText.length, newTagList.join(',').length);
            });
        }
    }
}

function createSelection(field, start, end) {
    if( field.createTextRange ) {
        var selRange = field.createTextRange();
        selRange.collapse(true);
        selRange.moveStart('character', start);
        selRange.moveEnd('character', end);
        selRange.select();
        field.focus();
    } else if( field.setSelectionRange ) {
        field.focus();
        field.setSelectionRange(start, end);
    } else if( typeof field.selectionStart != 'undefined' ) {
        field.selectionStart = start;
        field.selectionEnd = end;
        field.focus();
    }
}

window.onload = function() {
    var testTagsInputs = document.getElementsByClassName('test-tags-input');
    for(var i = 0 ; i < testTagsInputs.length ; i++) {
        testTagsInputs[i].trueInput = '';
        testTagsInputs[i].addEventListener('keypress', makeAutoCompleter(testTags));
    }
    var platformTagsInputs = document.getElementsByClassName('platform-tags-input');
    for(var i = 0 ; i < platformTagsInputs.length ; i++) {
        platformTagsInputs[i].trueInput = '';
        platformTagsInputs[i].addEventListener('keypress', makeAutoCompleter(platformTags));
    }
};
