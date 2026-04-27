package com.lexiquest.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;
import java.util.Random;

public class LexiWidget extends AppWidgetProvider {

    private static final String[] WORDS = {"Eloquent", "Resilient", "Meticulous", "Plausible", "Tenacious"};
    private static final String[] MEANINGS = {
        "Fluent or persuasive in speaking or writing.",
        "Able to withstand or recover quickly from difficult conditions.",
        "Showing great attention to detail; very careful and precise.",
        "Seeming reasonable or probable.",
        "Tending to keep a firm hold of something; clinging or adhering closely."
    };

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
                                int appWidgetId) {

        int index = new Random().nextInt(WORDS.length);
        String word = WORDS[index];
        String meaning = MEANINGS[index];

        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.lexi_widget);
        views.setTextViewText(R.id.widget_word, word);
        views.setTextViewText(R.id.widget_meaning, meaning);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // Enter relevant functionality for when the first widget is created
    }

    @Override
    public void onDisabled(Context context) {
        // Enter relevant functionality for when the last widget is disabled
    }
}
