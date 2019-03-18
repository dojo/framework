# Is Dojo a toolkit or a framework?

**Yes.** Dojo is intended to be a highly opinionated framework, but also a toolkit. The toolkit are the parts and pieces to create the opinionated framework. The framework requires the toolkit, but the toolkit can easily be used on its own. In fact, parts of the framework could be used on their own or integrated with other solutions.

One of the lessons we felt we learned from the Dojo Toolkit is that at the time it was first created application frameworks for the web were nascent, mostly because a lot of the basics needed to be built and the Dojo Toolkit became a large collection of those tools. Some of them fit well together and some of them were clearly adjuncts. Eventually, there were attempts to fit an application framework on top, but those felt much more like a _Frankenstein experiment_ than a solution.

With Dojo we want to make sure that we have a clear direction for an application framework that will help the tools be a cohesive set of tools, solving what is needed to support the framework.

Another lesson that we felt we learned from the Dojo Toolkit, is as it grew organically, it often picked up multiple ways to solve the problem, sometimes because backwards compatibility was prized above API complexity, but admittedly there was also a desire to give a developer as much flexibility as possible and not constrain the consumer.

# Why are you building Dojo, because there is _X_ framework?

It is true that the web has come a long way since the Dojo Toolkit was first released. There are many very popular frameworks and toolkits out there. There is even a list of [100+ JavaScript frameworks for web developers](http://www.cssauthor.com/javascript-frameworks/) and [someone pointing out that this is an issue](https://twitter.com/iamdevloper/status/661168082572939265).

Putting that aside, the Dojo Toolkit is far more popular than a lot of people assume, including ourselves. An analysis by Microsoft of toolkit usage, including that for non-public web apps, indicated that the Dojo Toolkit was the 3<sup>rd</sup> most popular toolkit/framework by usage.

We believe there are problems that are not well addressed at the moment by other toolkits. We are not building Dojo to just build Dojo, but we believe we have a clarity of purpose that will help guide us.

# What problem is Dojo solving?

The problem we think that Dojo can help solve, that is not as well addressed by other toolkits and frameworks, is the problem around data-rich web applications. One of the bigger use cases for the Dojo Toolkit (and other associated projects like dgrid and dstore) are to build complex applications.

Most web applications today address the problem of one logged in user, managing a fairly limited state. There maybe a few thousand objects that are fairly congruent which are represented. For example, a messaging application might have to display the user's state, the state of their friends and maybe a few hundred of the most recent messages. Applications like photo galleries can show several items and lazy load more, but those objects

There is a need to be able to represent large amounts of data/state and to be able to perform operations on that data while only part of that state maybe represented on the client. There are clear concepts of data that is currently visible, data that maybe on the client, and data is on the server side. In addition, we see applications where that data isn't from one single congruent store, but actually is often from several logical stores, where there are relationships between the different stores, all which need to be represented on the client side. In addition, to make truly mobile applications, where ubiquitous connectivity to the back-end is not always possible, there is a need to make these applications work in a seamless online/offline mode and be able to handle conflict resolution when connectivity is available.

There are also other features that are important to the enterprise web applications that are not as directly addressed by other toolkits and frameworks. Those are internationalisation, accessibility and security. We plan to ensure that those are properly addressed by Dojo.

Just as much with the Dojo Toolkit, we believe that there is likely to be a need to utilise Dojo in the enterprise environment, where there are large development teams and where the application lifecycle is often extremely extended. In many cases with the Dojo Toolkit we see a divide between the development and maintenance teams, and application life-cycles in the terms of years before there is a significant overhaul of the application. In that sense, we need to make sure that we provide the tools to make maintenance of the application easy and "cost effective". This in part is why we have focused on TypeScript to help ensure that code is developed in a more maintainable way. We plan to be highly opinionated about coding styles and clarity of the APIs.

So, what we are building are the tools and a framework that make it easier to build robust, complex data rich, highly scalable, and performant web applications. These applications will be able to leverage the features of internationalisation, accessibility, and help ensure secure systems. The tools and framework will be built in a way to promote code maintenance and allow engineers to quickly come up to speed in using Dojo.

# What about developer ergonomics?

We believe there is a distinction between "developer ergonomics" and "coddling developers". We believe often that engineers are tempted to make development "easier" (because that is what they understand) without proper recognition of what impacts they are making on the end user. Also, we believe that as the JavaScript has become more ubiquitous as well as what is possible on the web has become more rich, we are actually getting less done with more. [Christian Heilmann](https://www.christianheilmann.com/) has recently reminded us of [May's Law](: _Software efficiency halves every 18 months, compensating Moore's law._ He also recently quipped "I have 200mb of Node modules and I don't know what they do." In ways, we see this as the conflagration of "lazy" development under the guise of "developer ergonomics"

So Dojo will attempt to guard ourselves of being "lazy" but recognise that one of the keys of success for Dojo will be the ability for users to get quickly productive with Dojo and for large teams to be able to use Dojo effectively as part of larger project of disparate technologies.

A big objective will the challenge of getting a new user from zero to building a full, production ready, web application in a single tutorial that should take only 10 - 15 minutes to complete. By accomplishing this, this will tackle the perception of the high barrier of entry perceived for the Dojo Toolkit in addition to ensuring that we have the right pieces in place to make the whole developer experience effective.

We will also deliver clear opinions about how to leverage Dojo at every part of an application lifecycle, including development, testing, build, deployment, and debugging.

# What about user experience?

We will deliver both code that is designed to balance functionality with performance, but also provide tools and APIs that promote good software design and architecture that help guarantee a performant user experience. We will focus on integrating tools that will help engineers understand the performance of their web application. We will also make integrations to application management tooling easier and in ways that make in life maintenance of the applications easier.

We will articulate opinions that err on the side of preserving the user experience and if that means contr

# Is Dojo an opinionated framework?

Yes and no. The framework part of Dojo is highly opinionated in order to ensure that the API surface is clean, that the implementations are minimal to meet the framework's need and to reduce Dojo project development "wastage". That doesn't mean that we want to promote a "it is all or nothing" approach. Dojo, just like the Dojo Toolkit is modular, designed in logical blocks that can be used with as minimal dependency on everything else without rewriting the fundamentals. If there is an part of Dojo that works for your use case, but the rest of it doesn't fit, that is perfectly fine. Our opinions are to help guide us and hopefully help others understand the intent of the code, not necessarily shackles to keep you from being innovative.

On the other hand, that does mean we are unlikely to consider bringing in features to Dojo that don't align to the opinionated framework.
