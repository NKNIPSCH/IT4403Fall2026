var searchTerm = "";
var currentPage = 1;
var resultsPerPage = 10;
var searchResults = [];
var bookAuthors = {};
var detailsRequest = null;
$(document).ready(function() {
    $("#searchButton").click(function() {
        searchBooks();
    });
    $("#searchInput").keypress(function(event) {
        if (event.which == 13) {
            searchBooks();
        }
    });
    $("#gridViewButton").click(function() {
        $("#results").removeClass("book-list").addClass("book-grid");
        $("#gridViewButton").addClass("active");
        $("#listViewButton").removeClass("active");
    });
    $("#listViewButton").click(function() {
        $("#results").removeClass("book-grid").addClass("book-list");
        $("#listViewButton").addClass("active");
        $("#gridViewButton").removeClass("active");
    });
    $("#gridViewButton").addClass("active");
    $("#results, #bookshelf").on("click", ".detailsButton", function() {
        var bookKey = $(this).attr("data-key");
        getBookDetails(bookKey);
        document.getElementById("detailsSection").scrollIntoView();
    });
    $("#searchNav").click(function(event) {
        event.preventDefault();
        $("#searchSection, #resultsSection").show();
        $("#collectionSection").hide();
        document.getElementById("searchSection").scrollIntoView();
    });
    $("#collectionNav").click(function(event) {
        event.preventDefault();
        $("#searchSection, #resultsSection").hide();
        $("#collectionSection").show();
        document.getElementById("collectionSection").scrollIntoView();
    });
    $("#collectionSection").hide();
    getCollection();
});
// Search for books
function searchBooks() {
    var newSearch = $("#searchInput").val().trim();
    if (newSearch == "") {
        $("#searchMessage").html("Please enter a search term.");
        return;
    }
    if (detailsRequest != null) {
        detailsRequest.abort();
    }
    searchTerm = newSearch;
    currentPage = 1;
    searchResults = [];
    bookAuthors = {};
    $("#searchMessage").html("");
    $("#results").html("<p>Loading books...</p>");
    $("#pageSelection").html("");
    $("#bookDetails").html("<p>Select a book to view its details.</p>");
    $("#searchButton").prop("disabled", true);
    $("#searchInput").prop("disabled", true);
    $.ajax({
        url: "https://openlibrary.org/search.json",
        type: "GET",
        data: {
            q: searchTerm,
            limit: 50,
            fields: "key,title,cover_i,author_name"
        },
        dataType: "json",
        success: function(data) {
            searchResults = data.docs || [];
            if (searchResults.length == 0) {
                $("#results").html("<p>No books found. Please try another search.</p>");
                return;
            }
            for (var i = 0; i < searchResults.length; i++) {
                var book = searchResults[i];
                bookAuthors[book.key] = book.author_name;
            }
            displayBooks();
        },
        error: function() {
            $("#results").html("<p>Unable to retrieve books. Please try again.</p>");
        },
        complete: function() {
            $("#searchButton").prop("disabled", false);
            $("#searchInput").prop("disabled", false);
        }
    });
}
// Display books using Mustache
function displayBooks() {
    var start = (currentPage - 1) * resultsPerPage;
    var end = start + resultsPerPage;
    var books = [];
    for (var i = start; i < end && i < searchResults.length; i++) {
        var book = searchResults[i];
        books.push({
            key: book.key,
            title: book.title,
            author: book.author_name ? book.author_name.join(", ") : "Unknown Author",
            cover: book.cover_i ? "https://covers.openlibrary.org/b/id/" + book.cover_i + "-M.jpg?default=false" : ""
        });
    }
    var template = $("#bookTemplate").html();
    $("#results").html(Mustache.render(template, {books: books}));
    displayPagination();
}
// Display pagination controls
function displayPagination() {
    var totalPages = Math.ceil(searchResults.length / resultsPerPage);
    var pageHTML = "<p>Page " + currentPage + " of " + totalPages + "</p>";
    if (currentPage > 1) {
        pageHTML += "<button onclick='changePage(" + (currentPage - 1) + ")'>Previous</button>";
    }
    for (var i = 1; i <= totalPages; i++) {
        pageHTML += "<button onclick='changePage(" + i + ")'";
        if (i == currentPage) {
            pageHTML += " disabled";
        }
        pageHTML += ">" + i + "</button>";
    }
    if (currentPage < totalPages) {
        pageHTML += "<button onclick='changePage(" + (currentPage + 1) + ")'>Next</button>";
    }
    $("#pageSelection").html(pageHTML);
}
// Change results page
function changePage(page) {
    currentPage = page;
    displayBooks();
}
// Get book details
function getBookDetails(workId) {
    if (detailsRequest != null) {
        detailsRequest.abort();
    }
    var bookId = workId.replace("/works/", "");
    $("#bookDetails").html("<p>Loading book details...</p>");
    detailsRequest = $.ajax({
        url: "https://openlibrary.org/works/" + bookId + ".json",
        type: "GET",
        dataType: "json",
        success: function(book) {
            var description = "Description unavailable.";
            if (book.description) {
                if (typeof book.description == "string") {
                    description = book.description;
                } else if (book.description.value) {
                    description = book.description.value;
                }
            }
            var subjects = [];
            if (book.subjects) {
                for (var i = 0; i < book.subjects.length && i < 10; i++) {
                    subjects.push({name: book.subjects[i]});
                }
            }
            var bookData = {
                title: book.title,
                workId: bookId,
                author: bookAuthors[workId] ? bookAuthors[workId].join(", ") : "Author information unavailable.",
                description: description,
                subjects: subjects,
                cover: book.covers && book.covers.length > 0 ? "https://covers.openlibrary.org/b/id/" + book.covers[0] + "-M.jpg?default=false" : "",
                bookUrl: "https://openlibrary.org/works/" + bookId
            };
            var template = $("#detailsTemplate").html();
            $("#bookDetails").html(Mustache.render(template, bookData));
        },
        error: function(xhr, status) {
            if (status != "abort") {
                $("#bookDetails").html("<p>Unable to retrieve book details. Please try again.</p>");
            }
        }
    });
}
// Get History book collection
function getCollection() {
    $("#bookshelf").html("<p>Loading book collection...</p>");
    $.ajax({
        url: "https://openlibrary.org/subjects/history.json",
        type: "GET",
        data: {
            limit: 10
        },
        dataType: "json",
        success: function(data) {
            if (!data.works || data.works.length == 0) {
                $("#bookshelf").html("<p>No books available in this collection.</p>");
                return;
            }
            var books = [];
            for (var i = 0; i < data.works.length; i++) {
                var book = data.works[i];
                var authors = [];
                if (book.authors) {
                    for (var j = 0; j < book.authors.length; j++) {
                        authors.push(book.authors[j].name);
                    }
                }
                bookAuthors[book.key] = authors;
                books.push({
                    key: book.key,
                    title: book.title,
                    author: authors.length > 0 ? authors.join(", ") : "Unknown Author",
                    cover: book.cover_id ? "https://covers.openlibrary.org/b/id/" + book.cover_id + "-M.jpg?default=false" : ""
                });
            }
            var template = $("#collectionTemplate").html();
            $("#bookshelf").html(Mustache.render(template, {books: books}));
        },
        error: function() {
            $("#bookshelf").html("<p>Unable to retrieve the book collection. Please try again later.</p>");
        }
    });
}