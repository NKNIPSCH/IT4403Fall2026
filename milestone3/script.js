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
            searchResults = data.docs;
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
// Display 10 books per page
function displayBooks() {
    var results = $("#results");
    results.html("");
    var start = (currentPage - 1) * resultsPerPage;
    var end = start + resultsPerPage;
    if (end > searchResults.length) {
        end = searchResults.length;
    }
    for (var i = start; i < end; i++) {
        var book = searchResults[i];
        var bookHTML = "<div class='book'>";
        if (book.cover_i) {
            bookHTML += "<img src='https://covers.openlibrary.org/b/id/" + book.cover_i + "-S.jpg?default=false' alt='Book Cover' onerror=\"this.outerHTML='No cover available'\">";
        } else {
            bookHTML += "<p>No cover available</p>";
        }
        bookHTML += "<a href='#detailsSection' onclick=\"getBookDetails('" + book.key + "')\">" + book.title + "</a>";
        bookHTML += "</div>";
        results.append(bookHTML);
    }
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
            var bookHTML = "<div class='book-details'>";
            if (book.covers && book.covers.length > 0) {
                bookHTML += "<img src='https://covers.openlibrary.org/b/id/" + book.covers[0] + "-M.jpg?default=false' alt='Book Cover' onerror=\"this.outerHTML='No cover available'\">";
            } else {
                bookHTML += "<p>No cover available</p>";
            }
            bookHTML += "<div>";
            bookHTML += "<h2>" + book.title + "</h2>";
            bookHTML += "<p><strong>Work ID:</strong> " + bookId + "</p>";
            if (bookAuthors[workId] && bookAuthors[workId].length > 0) {
                bookHTML += "<p><strong>Authors:</strong> " + bookAuthors[workId].join(", ") + "</p>";
            } else {
                bookHTML += "<p><strong>Authors:</strong> Author information unavailable.</p>";
            }
            if (book.description) {
                if (typeof book.description == "string") {
                    bookHTML += "<p><strong>Description:</strong> " + book.description + "</p>";
                } else if (book.description.value) {
                    bookHTML += "<p><strong>Description:</strong> " + book.description.value + "</p>";
                } else {
                    bookHTML += "<p><strong>Description:</strong> Description unavailable.</p>";
                }
            } else {
                bookHTML += "<p><strong>Description:</strong> Description unavailable.</p>";
            }
            if (book.subjects && book.subjects.length > 0) {
                bookHTML += "<h3>Subjects</h3>";
                bookHTML += "<ul>";
                for (var i = 0; i < book.subjects.length && i < 10; i++) {
                    bookHTML += "<li>" + book.subjects[i] + "</li>";
                }
                bookHTML += "</ul>";
            } else {
                bookHTML += "<p><strong>Subjects:</strong> No subjects available.</p>";
            }
            bookHTML += "<p><a href='https://openlibrary.org/works/" + bookId + "' target='_blank'>View on Open Library</a></p>";
            bookHTML += "</div>";
            bookHTML += "</div>";
            $("#bookDetails").html(bookHTML);
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
            $("#bookshelf").html("");
            if (!data.works || data.works.length == 0) {
                $("#bookshelf").html("<p>No books available in this collection.</p>");
                return;
            }
            for (var i = 0; i < data.works.length; i++) {
                var book = data.works[i];
                var bookHTML = "<div class='book'>";
                if (book.cover_id) {
                    bookHTML += "<img src='https://covers.openlibrary.org/b/id/" + book.cover_id + "-S.jpg?default=false' alt='Book Cover' onerror=\"this.outerHTML='No cover available'\">";
                } else {
                    bookHTML += "<p>No cover available</p>";
                }
                bookHTML += "<a href='#detailsSection' onclick=\"getBookDetails('" + book.key + "')\">" + book.title + "</a>";
                bookHTML += "</div>";
                $("#bookshelf").append(bookHTML);
                if (book.authors && book.authors.length > 0) {
                    var authors = [];
                    for (var j = 0; j < book.authors.length; j++) {
                        authors.push(book.authors[j].name);
                    }
                    bookAuthors[book.key] = authors;
                }
            }
        },
        error: function() {
            $("#bookshelf").html("<p>Unable to retrieve the book collection. Please try again later.</p>");
        }
    });
}