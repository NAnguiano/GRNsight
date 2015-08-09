$(function () {
    var getCount = function (path, callback) {
            $.getJSON("http://grnsight.cs.lmu.edu/server/ga?path=" + path).done(callback);
        },

        setReportResult = function (result) {
            $(".ga-report").text(result);            
        },

        getUploadCount = function () {
            getCount("upload", function (uploadCount) {
                $(".ga-upload").text(uploadCount);
            });
        },

        pathTail = location.pathname.split("/").pop();

    getCount(pathTail, function (pathResult) {
        if (pathTail === "") {
            getCount("index.html", function (indexCount) {
                setReportResult(pathResult + indexResult);
            });
        } else if (pathTail === "index.html") {
            getCount("", function (homeResult) {
                setReportResult(pathResult + homeResult);
            });
        } else {
            setReportResult(pathResult);
        }

        if (pathTail === "" || pathTail === "index.html" || pathTail === "beta.html") {
            getUploadCount();
        }
    });
});
