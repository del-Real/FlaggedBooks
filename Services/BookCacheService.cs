using System.Collections.Concurrent;

namespace FlaggedBooks.Services;

public class BookCacheService
{
    private readonly ConcurrentDictionary<string, CachedSearchResult> _cache = new();
    private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(30);

    public BookServiceSearchResponse? GetCachedSearch(string query)
    {
        var normalizedQuery = NormalizeQuery(query);

        if (_cache.TryGetValue(normalizedQuery, out var cached))
        {
            if (DateTime.UtcNow - cached.Timestamp < _cacheExpiration)
            {
                return cached.Result;
            }

            // Remove expired cache
            _cache.TryRemove(normalizedQuery, out _);
        }

        return null;
    }

    public void CacheSearch(string query, BookServiceSearchResponse result)
    {
        var normalizedQuery = NormalizeQuery(query);

        _cache[normalizedQuery] = new CachedSearchResult
        {
            Result = result,
            Timestamp = DateTime.UtcNow
        };
    }

    private static string NormalizeQuery(string query)
    {
        // Normalize to lowercase and trim for consistent caching
        return query.Trim().ToLower();
    }

    // Optional: Method to clear old cache entries
    public void ClearExpiredCache()
    {
        var expiredKeys = _cache
            .Where(kvp => DateTime.UtcNow - kvp.Value.Timestamp >= _cacheExpiration)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredKeys)
        {
            _cache.TryRemove(key, out _);
        }
    }

    // Optional: Get cache statistics
    public CacheStats GetStats()
    {
        return new CacheStats
        {
            TotalEntries = _cache.Count,
            ExpiredEntries = _cache.Count(kvp =>
                DateTime.UtcNow - kvp.Value.Timestamp >= _cacheExpiration)
        };
    }

    private class CachedSearchResult
    {
        public BookServiceSearchResponse Result { get; set; } = null!;
        public DateTime Timestamp { get; set; }
    }
}

public class CacheStats
{
    public int TotalEntries { get; set; }
    public int ExpiredEntries { get; set; }
}