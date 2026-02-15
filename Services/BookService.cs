using System.Text.Json;
using System.Text.Json.Serialization;

namespace FlaggedBooks.Services;

// For checking the information is properly retrieved we can go to the information of a book, for example:
// https://openlibrary.org/works/OL15437W.json

public class BookService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<BookService> _logger;
    private readonly BookCacheService _cache;

    public BookService(HttpClient httpClient, ILogger<BookService> logger, BookCacheService cache)
    {
        _httpClient = httpClient;
        _logger = logger;
        _cache = cache;
    }

    // Searches book API by query string (with caching)
    public async Task<BookServiceSearchResponse?> SearchBooksAsync(string query, int limit = 10)
    {
        try
        {
            var cacheKey = $"{query}|{limit}";

            var cachedResult = _cache.GetCachedSearch(cacheKey);
            if (cachedResult != null)
            {
                _logger.LogInformation("Cache hit for query: {Query}", query);
                return cachedResult;
            }

            _logger.LogInformation("Cache miss for query: {Query}, fetching from API", query);

            var url = $"https://openlibrary.org/search.json?q={Uri.EscapeDataString(query)}&limit={limit}";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Open Library API returned {StatusCode}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<BookServiceSearchResponse>(json);

            if (result != null)
            {
                _cache.CacheSearch(cacheKey, result);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching Open Library for: {Query}", query);
            return null;
        }
    }

    // Fetches detailed book info using ISBN
    public async Task<BookServiceBook?> GetBookByISBNAsync(string isbn)
    {
        try
        {
            var url = $"https://openlibrary.org/isbn/{isbn}.json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Book not found for ISBN: {ISBN}", isbn);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var bookData = JsonSerializer.Deserialize<BookServiceBookDetail>(json);
            if (bookData == null) return null;

            var workKey = bookData.Works?.FirstOrDefault()?.Key;
            BookServiceWork? workData = null;
            List<BookServiceAuthorRef>? workAuthors = null;

            if (!string.IsNullOrEmpty(workKey))
            {
                var workUrl = $"https://openlibrary.org{workKey}.json";
                var workResponse = await _httpClient.GetAsync(workUrl);
                if (workResponse.IsSuccessStatusCode)
                {
                    var workJson = await workResponse.Content.ReadAsStringAsync();
                    workData = JsonSerializer.Deserialize<BookServiceWork>(workJson);

                    if (workData != null)
                    {
                        using var doc = JsonDocument.Parse(workJson);
                        if (doc.RootElement.TryGetProperty("authors", out var authorsElem))
                        {
                            workAuthors = authorsElem
                                .EnumerateArray()
                                .Select(a => new BookServiceAuthorRef
                                {
                                    Key = a.GetProperty("author").GetProperty("key").GetString() ?? ""
                                })
                                .Where(a => !string.IsNullOrEmpty(a.Key))
                                .ToList();
                        }
                    }
                }
            }

            var authorRefs = bookData.Authors ?? workAuthors;

            return new BookServiceBook
            {
                Title = bookData.Title ?? "Unknown",
                Authors = await GetAuthorNamesAsync(authorRefs),
                ISBN = isbn,
                Description = ExtractDescription(workData?.Description),
                CoverUrl = $"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg",
                PublishDate = bookData.PublishDate,
                Publishers = bookData.Publishers,
                NumberOfPages = bookData.NumberOfPages
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching book by ISBN: {ISBN}", isbn);
            return null;
        }
    }

    // Fetches book info using Open Library ID
    public async Task<BookServiceBook?> GetBookByOLIDAsync(string olid)
    {
        try
        {
            var url = $"https://openlibrary.org/books/{olid}.json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Book not found for OLID: {OLID}", olid);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var bookData = JsonSerializer.Deserialize<BookServiceBookDetail>(json);
            if (bookData == null) return null;

            var workKey = bookData.Works?.FirstOrDefault()?.Key;
            BookServiceWork? workData = null;
            List<BookServiceAuthorRef>? workAuthors = null;

            if (!string.IsNullOrEmpty(workKey))
            {
                var workUrl = $"https://openlibrary.org{workKey}.json";
                var workResponse = await _httpClient.GetAsync(workUrl);
                if (workResponse.IsSuccessStatusCode)
                {
                    var workJson = await workResponse.Content.ReadAsStringAsync();
                    workData = JsonSerializer.Deserialize<BookServiceWork>(workJson);

                    if (workData != null)
                    {
                        using var doc = JsonDocument.Parse(workJson);
                        if (doc.RootElement.TryGetProperty("authors", out var authorsElem))
                        {
                            workAuthors = authorsElem
                                .EnumerateArray()
                                .Select(a => new BookServiceAuthorRef
                                {
                                    Key = a.GetProperty("author").GetProperty("key").GetString() ?? ""
                                })
                                .Where(a => !string.IsNullOrEmpty(a.Key))
                                .ToList();
                        }
                    }
                }
            }

            var authorRefs = bookData.Authors ?? workAuthors;

            return new BookServiceBook
            {
                Title = bookData.Title ?? "Unknown",
                Authors = await GetAuthorNamesAsync(authorRefs),
                ISBN = olid,
                Description = ExtractDescription(workData?.Description),
                CoverUrl = $"https://covers.openlibrary.org/b/olid/{olid}-L.jpg",
                PublishDate = bookData.PublishDate,
                Publishers = bookData.Publishers,
                NumberOfPages = bookData.NumberOfPages
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching book by OLID: {OLID}", olid);
            return null;
        }
    }

    // Fetches book info using work key
    public async Task<BookServiceBook?> GetBookByWorkKeyAsync(string workKey)
    {
        try
        {
            // 1. Get work details
            var workUrl = $"https://openlibrary.org{workKey}.json";
            var workResponse = await _httpClient.GetAsync(workUrl);

            if (!workResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("Book not found for Work Key: {WorkKey}", workKey);
                return null;
            }

            var workJson = await workResponse.Content.ReadAsStringAsync();
            var workData = JsonSerializer.Deserialize<BookServiceWork>(workJson);
            if (workData == null) return null;

            // Get authors
            List<BookServiceAuthorRef>? workAuthors = null;
            string? title = null;
            var coverUrl = "https://via.placeholder.com/250x350?text=No+Cover";

            using (var doc = JsonDocument.Parse(workJson))
            {
                if (doc.RootElement.TryGetProperty("authors", out var authorsElem))
                {
                    var authorsList = new List<BookServiceAuthorRef>();
                    foreach (var a in authorsElem.EnumerateArray())
                    {
                        if (a.TryGetProperty("author", out var authorElem) &&
                            authorElem.TryGetProperty("key", out var keyElem))
                        {
                            var key = keyElem.GetString();
                            if (!string.IsNullOrEmpty(key))
                            {
                                authorsList.Add(new BookServiceAuthorRef { Key = key });
                            }
                        }
                    }
                    workAuthors = authorsList;
                }

                if (doc.RootElement.TryGetProperty("title", out var titleElem))
                {
                    title = titleElem.GetString();
                }

                if (doc.RootElement.TryGetProperty("covers", out var coversElem) &&
                    coversElem.ValueKind == JsonValueKind.Array)
                {
                    var firstCover = coversElem.EnumerateArray().FirstOrDefault();
                    if (firstCover.ValueKind == JsonValueKind.Number)
                    {
                        coverUrl = $"https://covers.openlibrary.org/b/id/{firstCover.GetInt64()}-L.jpg";
                    }
                }
            }

            // 2. Get editions of this work to find publication details
            var editionsUrl = $"https://openlibrary.org{workKey}/editions.json?limit=1";
            var editionsResponse = await _httpClient.GetAsync(editionsUrl);

            string? publishDate = null;
            List<string>? publishers = null;
            int? numberOfPages = null;
            string? isbn10 = null;
            string? isbn13 = null;
            string? editionKey = null;

            if (editionsResponse.IsSuccessStatusCode)
            {
                var editionsJson = await editionsResponse.Content.ReadAsStringAsync();
                using var editionsDoc = JsonDocument.Parse(editionsJson);

                if (editionsDoc.RootElement.TryGetProperty("entries", out var entriesElem) &&
                    entriesElem.ValueKind == JsonValueKind.Array)
                {
                    var firstEdition = entriesElem.EnumerateArray().FirstOrDefault();

                    if (firstEdition.ValueKind == JsonValueKind.Object)
                    {
                        // Get edition key (Open Library ID)
                        if (firstEdition.TryGetProperty("key", out var keyElem))
                        {
                            editionKey = keyElem.GetString()?.Replace("/books/", "");
                        }

                        // Get publish date
                        if (firstEdition.TryGetProperty("publish_date", out var pubDateElem))
                        {
                            publishDate = pubDateElem.GetString();
                        }

                        // Get publishers
                        if (firstEdition.TryGetProperty("publishers", out var pubsElem) &&
                            pubsElem.ValueKind == JsonValueKind.Array)
                        {
                            publishers = pubsElem.EnumerateArray()
                                .Select(p => p.GetString())
                                .Where(p => p != null)
                                .Cast<string>()
                                .ToList();
                        }

                        // Get number of pages
                        if (firstEdition.TryGetProperty("number_of_pages", out var pagesElem))
                        {
                            numberOfPages = pagesElem.GetInt32();
                        }

                        // Get ISBN-13
                        if (firstEdition.TryGetProperty("isbn_13", out var isbn13Elem) &&
                            isbn13Elem.ValueKind == JsonValueKind.Array)
                        {
                            isbn13 = isbn13Elem.EnumerateArray().FirstOrDefault().GetString();
                        }

                        // Get ISBN-10
                        if (firstEdition.TryGetProperty("isbn_10", out var isbn10Elem) &&
                            isbn10Elem.ValueKind == JsonValueKind.Array)
                        {
                            isbn10 = isbn10Elem.EnumerateArray().FirstOrDefault().GetString();
                        }
                    }
                }
            }

            return new BookServiceBook
            {
                Title = title ?? "Unknown",
                Authors = await GetAuthorNamesAsync(workAuthors),
                ISBN = isbn13 ?? isbn10 ?? workKey.TrimStart('/'),
                ISBN10 = isbn10,
                ISBN13 = isbn13,
                EditionKey = editionKey,
                Description = ExtractDescription(workData.Description),
                CoverUrl = coverUrl,
                PublishDate = publishDate,
                Publishers = publishers,
                NumberOfPages = numberOfPages
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching book by Work Key: {WorkKey}", workKey);
            return null;
        }
    }

    // Helper that fetches author names from their keys
    private async Task<List<string>> GetAuthorNamesAsync(List<BookServiceAuthorRef>? authorRefs)
    {
        var authorNames = new List<string>();

        if (authorRefs == null || !authorRefs.Any())
            return authorNames;

        foreach (var authorRef in authorRefs.Take(3))
        {
            try
            {
                var url = $"https://openlibrary.org{authorRef.Key}.json";
                var response = await _httpClient.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var author = JsonSerializer.Deserialize<BookServiceAuthor>(json);
                    if (author?.Name != null)
                    {
                        authorNames.Add(author.Name);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not fetch author: {AuthorKey}", authorRef.Key);
            }
        }

        return authorNames;
    }

    // Helper that parses different description formats from API
    private static string ExtractDescription(object? description)
    {
        if (description == null)
            return "No description available";

        try
        {
            if (description is JsonElement element)
            {
                if (element.ValueKind == JsonValueKind.String)
                {
                    return element.GetString() ?? "No description available";
                }

                if (element.ValueKind == JsonValueKind.Object)
                {
                    if (element.TryGetProperty("value", out JsonElement valueElement))
                    {
                        return valueElement.GetString() ?? "No description available";
                    }
                }

                if (element.ValueKind == JsonValueKind.Array)
                {
                    var firstElement = element.EnumerateArray().FirstOrDefault();
                    if (firstElement.ValueKind == JsonValueKind.String)
                    {
                        return firstElement.GetString() ?? "No description available";
                    }
                }
            }

            return description.ToString() ?? "No description available";
        }
        catch (Exception)
        {
            return "No description available";
        }
    }

    public static string GetCoverUrl(string isbn, string size = "L")
    {
        return $"https://covers.openlibrary.org/b/isbn/{isbn}-{size}.jpg";
    }
}

// Response models
public class BookServiceSearchResponse
{
    [JsonPropertyName("docs")]
    public List<BookServiceSearchDoc> Docs { get; set; } = new();

    [JsonPropertyName("num_found")]
    public int NumFound { get; set; }
}

public class BookServiceSearchDoc
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("author_name")]
    public List<string>? AuthorName { get; set; }

    [JsonPropertyName("isbn")]
    public List<string>? ISBN { get; set; }

    [JsonPropertyName("edition_key")]
    public List<string>? EditionKey { get; set; }

    [JsonPropertyName("key")]
    public string? Key { get; set; }

    [JsonPropertyName("first_publish_year")]
    public int? FirstPublishYear { get; set; }

    [JsonPropertyName("cover_i")]
    public long? CoverId { get; set; }

    [JsonPropertyName("publisher")]
    public List<string>? Publisher { get; set; }

    public string GetCoverUrl(string size = "L")
    {
        if (CoverId.HasValue)
            return $"https://covers.openlibrary.org/b/id/{CoverId.Value}-{size}.jpg";

        if (ISBN != null && ISBN.Any())
            return $"https://covers.openlibrary.org/b/isbn/{ISBN.First()}-{size}.jpg";

        return "";
    }
}

public class BookServiceBookDetail
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("authors")]
    public List<BookServiceAuthorRef>? Authors { get; set; }

    [JsonPropertyName("publish_date")]
    public string? PublishDate { get; set; }

    [JsonPropertyName("publishers")]
    public List<string>? Publishers { get; set; }

    [JsonPropertyName("number_of_pages")]
    public int? NumberOfPages { get; set; }

    [JsonPropertyName("works")]
    public List<BookServiceWorkRef>? Works { get; set; }
}

public class BookServiceAuthorRef
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = "";
}

public class BookServiceWorkRef
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = "";
}

public class BookServiceAuthor
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class BookServiceWork
{
    [JsonPropertyName("description")]
    public object? Description { get; set; }
}

public class BookServiceBook
{
    public string Title { get; set; } = "";
    public List<string> Authors { get; set; } = new();
    public string ISBN { get; set; } = "";
    public string? ISBN10 { get; set; }
    public string? ISBN13 { get; set; }
    public string? EditionKey { get; set; }
    public string Description { get; set; } = "";
    public string CoverUrl { get; set; } = "";
    public string? PublishDate { get; set; }
    public List<string>? Publishers { get; set; }
    public int? NumberOfPages { get; set; }
}