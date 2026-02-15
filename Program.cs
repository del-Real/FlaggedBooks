using Microsoft.EntityFrameworkCore;
using FlaggedBooks.Extensions;
using FlaggedBooks.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowMyFrontend", policy =>
    {
        policy.WithOrigins("http://127.0.0.1:5500")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddOpenApi();
builder.Services.AddResponseCaching();
builder.Services.AddApplicationServices(builder.Configuration);

var app = builder.Build();

// Initialize database
await app.InitializeDatabaseAsync();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseResponseCaching();
app.UseCors("AllowMyFrontend");
app.UseSession();

// Map all endpoints
app.MapAuthEndpoints();
app.MapBookEndpoints();
app.MapChatEndpoints();
app.MapLectureClubEndpoints();
app.MapUserBooksEndpoints();
app.MapUserProfileEndpoints();

app.Run();